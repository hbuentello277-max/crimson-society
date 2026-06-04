-- Crimson Credits Phase 3 V1: earn ledger, monthly cap, referrals, meet rewards.

-- ---------------------------------------------------------------------------
-- Profile referral fields
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by_user_id uuid references public.profiles(id) on delete set null;

create unique index if not exists profiles_referral_code_key
  on public.profiles (referral_code)
  where referral_code is not null;

create index if not exists profiles_referred_by_user_id_idx
  on public.profiles (referred_by_user_id)
  where referred_by_user_id is not null;

-- ---------------------------------------------------------------------------
-- Grants (authenticated read own rows via RLS)
-- ---------------------------------------------------------------------------
grant select on public.crimson_credits to authenticated;
grant select on public.crimson_credit_transactions to authenticated;
grant select, insert, update on public.crimson_credits to service_role;
grant select, insert on public.crimson_credit_transactions to service_role;

-- ---------------------------------------------------------------------------
-- Idempotency: one earn key per user
-- ---------------------------------------------------------------------------
create unique index if not exists crimson_credit_transactions_idempotency_key
  on public.crimson_credit_transactions (user_id, ((metadata ->> 'idempotency_key')))
  where (metadata ->> 'idempotency_key') is not null
    and (metadata ->> 'idempotency_key') <> '';

-- ---------------------------------------------------------------------------
-- Referral code generation + immutability
-- ---------------------------------------------------------------------------
create or replace function public.ensure_profile_referral_code()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  suffix int := 0;
begin
  if new.referral_code is not null and btrim(new.referral_code) <> '' then
    new.referral_code := upper(btrim(new.referral_code));
    return new;
  end if;

  base := upper(
    regexp_replace(
      coalesce(nullif(btrim(new.username), ''), substr(replace(new.id::text, '-', ''), 1, 8)),
      '[^A-Z0-9]',
      '',
      'g'
    )
  );

  if char_length(base) < 4 then
    base := upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;

  candidate := substr(base, 1, 12);

  while exists (
    select 1
    from public.profiles p
    where p.referral_code = candidate
      and p.id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate := substr(base, 1, 10) || suffix::text;
  end loop;

  new.referral_code := candidate;
  return new;
end;
$$;

drop trigger if exists ensure_profile_referral_code_before_write on public.profiles;
create trigger ensure_profile_referral_code_before_write
before insert or update of username, referral_code on public.profiles
for each row execute function public.ensure_profile_referral_code();

create or replace function public.prevent_referred_by_change()
returns trigger
language plpgsql
as $$
begin
  if new.referred_by_user_id is not null and new.referred_by_user_id = new.id then
    raise exception 'Self-referral is not allowed.';
  end if;

  if old.referred_by_user_id is not null
     and new.referred_by_user_id is distinct from old.referred_by_user_id then
    raise exception 'Referral attribution cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_referred_by_change_before_update on public.profiles;
create trigger prevent_referred_by_change_before_update
before update of referred_by_user_id on public.profiles
for each row execute function public.prevent_referred_by_change();

-- Backfill referral codes for existing profiles
update public.profiles p
set username = p.username
where p.referral_code is null or btrim(p.referral_code) = '';

-- ---------------------------------------------------------------------------
-- Core award function (security definer; no client direct ledger writes)
-- ---------------------------------------------------------------------------
create or replace function public.award_crimson_credits(
  p_target_user_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_reason text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monthly_cap constant integer := 500;
  v_month_start timestamptz := date_trunc('month', timezone('utc', now()));
  v_monthly_earned integer := 0;
  v_award integer := 0;
  v_balance_row public.crimson_credits%rowtype;
  v_existing_id uuid;
  v_meta jsonb;
begin
  if p_target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if p_transaction_type is null or btrim(p_transaction_type) = '' then
    raise exception 'transaction_type is required';
  end if;

  v_meta := coalesce(p_metadata, '{}'::jsonb);

  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    select t.id
    into v_existing_id
    from public.crimson_credit_transactions t
    where t.user_id = p_target_user_id
      and t.metadata ->> 'idempotency_key' = btrim(p_idempotency_key)
    limit 1;

    if v_existing_id is not null then
      select coalesce(sum(t.amount), 0)::integer
      into v_monthly_earned
      from public.crimson_credit_transactions t
      where t.user_id = p_target_user_id
        and t.amount > 0
        and t.created_at >= v_month_start;

      select * into v_balance_row
      from public.crimson_credits c
      where c.user_id = p_target_user_id;

      return jsonb_build_object(
        'awarded', 0,
        'duplicate', true,
        'monthly_earned', v_monthly_earned,
        'monthly_cap', v_monthly_cap,
        'credits_balance', coalesce(v_balance_row.credits_balance, 0)
      );
    end if;

    v_meta := v_meta || jsonb_build_object('idempotency_key', btrim(p_idempotency_key));
  end if;

  select coalesce(sum(t.amount), 0)::integer
  into v_monthly_earned
  from public.crimson_credit_transactions t
  where t.user_id = p_target_user_id
    and t.amount > 0
    and t.created_at >= v_month_start;

  v_award := least(p_amount, greatest(0, v_monthly_cap - v_monthly_earned));

  if v_award <= 0 then
    select * into v_balance_row
    from public.crimson_credits c
    where c.user_id = p_target_user_id;

    return jsonb_build_object(
      'awarded', 0,
      'duplicate', false,
      'capped', true,
      'monthly_earned', v_monthly_earned,
      'monthly_cap', v_monthly_cap,
      'credits_balance', coalesce(v_balance_row.credits_balance, 0)
    );
  end if;

  insert into public.crimson_credits (user_id, credits_balance, lifetime_credits_earned)
  values (p_target_user_id, 0, 0)
  on conflict (user_id) do nothing;

  insert into public.crimson_credit_transactions (
    user_id,
    amount,
    transaction_type,
    reason,
    metadata
  )
  values (
    p_target_user_id,
    v_award,
    btrim(p_transaction_type),
    p_reason,
    v_meta
  );

  update public.crimson_credits c
  set credits_balance = c.credits_balance + v_award,
      lifetime_credits_earned = c.lifetime_credits_earned + v_award
  where c.user_id = p_target_user_id
  returning * into v_balance_row;

  v_monthly_earned := v_monthly_earned + v_award;

  return jsonb_build_object(
    'awarded', v_award,
    'duplicate', false,
    'capped', v_award < p_amount,
    'monthly_earned', v_monthly_earned,
    'monthly_cap', v_monthly_cap,
    'credits_balance', v_balance_row.credits_balance
  );
end;
$$;

revoke all on function public.award_crimson_credits(uuid, integer, text, text, text, jsonb) from public;
grant execute on function public.award_crimson_credits(uuid, integer, text, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Monthly summary for profile UI
-- ---------------------------------------------------------------------------
create or replace function public.get_crimson_credits_summary(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_month_start timestamptz := date_trunc('month', timezone('utc', now()));
  v_monthly_earned integer := 0;
  v_balance integer := 0;
  v_lifetime_earned integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() is distinct from v_uid
     and not public.is_profile_admin(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  select coalesce(sum(t.amount), 0)::integer
  into v_monthly_earned
  from public.crimson_credit_transactions t
  where t.user_id = v_uid
    and t.amount > 0
    and t.created_at >= v_month_start;

  select
    coalesce(c.credits_balance, 0),
    coalesce(c.lifetime_credits_earned, 0)
  into v_balance, v_lifetime_earned
  from public.crimson_credits c
  where c.user_id = v_uid;

  return jsonb_build_object(
    'credits_balance', v_balance,
    'lifetime_credits_earned', v_lifetime_earned,
    'monthly_earned', v_monthly_earned,
    'monthly_cap', 500
  );
end;
$$;

revoke all on function public.get_crimson_credits_summary(uuid) from public;
grant execute on function public.get_crimson_credits_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Referral attribution (once per user)
-- ---------------------------------------------------------------------------
create or replace function public.attribute_referral(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_referrer_id uuid;
  v_current_referred_by uuid;
  v_award jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_code = '' then
    raise exception 'Referral code is required';
  end if;

  select p.referred_by_user_id
  into v_current_referred_by
  from public.profiles p
  where p.id = v_user_id;

  if v_current_referred_by is not null then
    return jsonb_build_object('ok', false, 'error', 'already_referred');
  end if;

  select p.id
  into v_referrer_id
  from public.profiles p
  where p.referral_code = v_code
  limit 1;

  if v_referrer_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_referrer_id = v_user_id then
    return jsonb_build_object('ok', false, 'error', 'self_referral');
  end if;

  update public.profiles
  set referred_by_user_id = v_referrer_id
  where id = v_user_id
    and referred_by_user_id is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'already_referred');
  end if;

  v_award := public.award_crimson_credits(
    v_referrer_id,
    25,
    'referral_signup',
    'Referral signup bonus',
    'referral_signup:' || v_user_id::text,
    jsonb_build_object('referred_user_id', v_user_id, 'referral_code', v_code)
  );

  return jsonb_build_object(
    'ok', true,
    'referrer_id', v_referrer_id,
    'award', v_award
  );
end;
$$;

revoke all on function public.attribute_referral(text) from public;
grant execute on function public.attribute_referral(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Referral Blackcard conversion (Stripe-paid only; idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.award_referral_blackcard_conversion(p_referred_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_has_stripe_sub boolean := false;
  v_award jsonb;
begin
  if p_referred_user_id is null then
    raise exception 'referred_user_id is required';
  end if;

  select p.referred_by_user_id
  into v_referrer_id
  from public.profiles p
  where p.id = p_referred_user_id;

  if v_referrer_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_referrer');
  end if;

  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_referred_user_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end >= now())
  )
  into v_has_stripe_sub;

  if not v_has_stripe_sub then
    return jsonb_build_object('ok', false, 'reason', 'no_active_stripe_subscription');
  end if;

  v_award := public.award_crimson_credits(
    v_referrer_id,
    50,
    'referral_blackcard',
    'Referral became Blackcard member',
    'referral_blackcard:' || p_referred_user_id::text,
    jsonb_build_object('referred_user_id', p_referred_user_id)
  );

  return jsonb_build_object('ok', true, 'referrer_id', v_referrer_id, 'award', v_award);
end;
$$;

revoke all on function public.award_referral_blackcard_conversion(uuid) from public;
grant execute on function public.award_referral_blackcard_conversion(uuid) to service_role;

-- Meet earn awards: see 20260611130000_crimson_credits_meet_completion_awards.sql
-- (credits on tracking end + valid attendance, not on ride/attendee insert).
