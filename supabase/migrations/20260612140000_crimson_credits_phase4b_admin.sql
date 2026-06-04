-- Crimson Credits Phase 4B: admin economy settings, earn-path refactor, admin adjustments.

-- ---------------------------------------------------------------------------
-- Economy settings (platform_settings)
-- ---------------------------------------------------------------------------
insert into public.platform_settings (key, value)
values (
  'crimson_credits_economy',
  jsonb_build_object(
    'attend_meet_credits', 10,
    'host_meet_credits', 20,
    'referral_signup_credits', 25,
    'referral_blackcard_credits', 50,
    'monthly_earn_cap', 500,
    'credits_per_100_usd', 5,
    'blackcard_merch_discount_percent', 10,
    'earn_attend_meet_enabled', true,
    'earn_host_meet_enabled', true,
    'earn_referral_signup_enabled', true,
    'earn_referral_blackcard_enabled', true
  )
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Settings reader (defaults merged; used by earn paths + summary)
-- ---------------------------------------------------------------------------
create or replace function public.crimson_credits_economy_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_raw jsonb;
  v_defaults jsonb := jsonb_build_object(
    'attend_meet_credits', 10,
    'host_meet_credits', 20,
    'referral_signup_credits', 25,
    'referral_blackcard_credits', 50,
    'monthly_earn_cap', 500,
    'credits_per_100_usd', 5,
    'blackcard_merch_discount_percent', 10,
    'earn_attend_meet_enabled', true,
    'earn_host_meet_enabled', true,
    'earn_referral_signup_enabled', true,
    'earn_referral_blackcard_enabled', true
  );
begin
  select value
  into v_raw
  from public.platform_settings
  where key = 'crimson_credits_economy';

  return v_defaults || coalesce(v_raw, '{}'::jsonb);
end;
$$;

revoke all on function public.crimson_credits_economy_settings() from public;
grant execute on function public.crimson_credits_economy_settings() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Core award function — reads cap from settings; admin_adjustment excluded from cap math
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
  v_settings jsonb := public.crimson_credits_economy_settings();
  v_monthly_cap integer;
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

  v_monthly_cap := greatest(0, coalesce((v_settings->>'monthly_earn_cap')::integer, 500));

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
        and t.transaction_type is distinct from 'admin_adjustment'
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
    and t.transaction_type is distinct from 'admin_adjustment'
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

-- ---------------------------------------------------------------------------
-- Monthly summary — cap from settings; monthly earned excludes admin adjustments
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
  v_settings jsonb := public.crimson_credits_economy_settings();
  v_month_start timestamptz := date_trunc('month', timezone('utc', now()));
  v_monthly_earned integer := 0;
  v_balance integer := 0;
  v_lifetime_earned integer := 0;
  v_monthly_cap integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() is distinct from v_uid
     and not public.is_profile_admin(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  v_monthly_cap := greatest(0, coalesce((v_settings->>'monthly_earn_cap')::integer, 500));

  select coalesce(sum(t.amount), 0)::integer
  into v_monthly_earned
  from public.crimson_credit_transactions t
  where t.user_id = v_uid
    and t.amount > 0
    and t.transaction_type is distinct from 'admin_adjustment'
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
    'monthly_cap', v_monthly_cap
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Referral attribution — respects economy toggles + amounts
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
  v_settings jsonb := public.crimson_credits_economy_settings();
  v_amount integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_code = '' then
    raise exception 'Referral code is required';
  end if;

  if not public.is_valid_referral_code_format(v_code) then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
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

  perform set_config('app.allow_referred_by_attribution', 'true', true);

  update public.profiles
  set referred_by_user_id = v_referrer_id
  where id = v_user_id
    and referred_by_user_id is null;

  perform set_config('app.allow_referred_by_attribution', 'false', true);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'already_referred');
  end if;

  if coalesce((v_settings->>'earn_referral_signup_enabled')::boolean, true) then
    v_amount := greatest(0, coalesce((v_settings->>'referral_signup_credits')::integer, 25));

    if v_amount > 0 then
      v_award := public.award_crimson_credits(
        v_referrer_id,
        v_amount,
        'referral_signup',
        'Referral signup bonus',
        'referral_signup:' || v_user_id::text,
        jsonb_build_object('referred_user_id', v_user_id, 'referral_code', v_code)
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'referrer_id', v_referrer_id,
    'award', v_award
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Referral Blackcard conversion — respects economy toggles + amounts
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
  v_settings jsonb := public.crimson_credits_economy_settings();
  v_amount integer;
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

  if not coalesce((v_settings->>'earn_referral_blackcard_enabled')::boolean, true) then
    return jsonb_build_object('ok', false, 'reason', 'earning_disabled');
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

  v_amount := greatest(0, coalesce((v_settings->>'referral_blackcard_credits')::integer, 50));

  if v_amount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'zero_credit_amount');
  end if;

  v_award := public.award_crimson_credits(
    v_referrer_id,
    v_amount,
    'referral_blackcard',
    'Referral became Blackcard member',
    'referral_blackcard:' || p_referred_user_id::text,
    jsonb_build_object('referred_user_id', p_referred_user_id)
  );

  return jsonb_build_object('ok', true, 'referrer_id', v_referrer_id, 'award', v_award);
end;
$$;

-- ---------------------------------------------------------------------------
-- Meet completion awards — respects economy toggles + amounts
-- ---------------------------------------------------------------------------
create or replace function public.try_award_meet_completion_credits(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
  v_other_attendee_count integer := 0;
  v_min_duration constant interval := interval '5 minutes';
  v_attendee_user_id uuid;
  v_settings jsonb := public.crimson_credits_economy_settings();
  v_host_amount integer;
  v_attend_amount integer;
begin
  select * into v_ride
  from public.rides r
  where r.id = p_ride_id;

  if not found then
    return;
  end if;

  if v_ride.tracking_status <> 'ended' then
    return;
  end if;

  if v_ride.status is distinct from 'active' then
    return;
  end if;

  if v_ride.started_at is null or v_ride.ended_at is null then
    return;
  end if;

  if v_ride.ended_at < v_ride.started_at + v_min_duration then
    return;
  end if;

  select count(*)::integer
  into v_other_attendee_count
  from public.ride_attendees ra
  where ra.ride_id = v_ride.id
    and ra.user_id <> v_ride.host_id
    and ra.status = 'going';

  if v_other_attendee_count < 1 then
    return;
  end if;

  v_host_amount := greatest(0, coalesce((v_settings->>'host_meet_credits')::integer, 20));
  v_attend_amount := greatest(0, coalesce((v_settings->>'attend_meet_credits')::integer, 10));

  if coalesce((v_settings->>'earn_host_meet_enabled')::boolean, true) and v_host_amount > 0 then
    perform public.award_crimson_credits(
      v_ride.host_id,
      v_host_amount,
      'meet_hosted',
      'Hosted a completed meet',
      'meet_host:' || v_ride.host_id::text || ':' || v_ride.id::text,
      jsonb_build_object(
        'ride_id', v_ride.id,
        'completed_at', v_ride.ended_at,
        'other_attendee_count', v_other_attendee_count
      )
    );
  end if;

  if coalesce((v_settings->>'earn_attend_meet_enabled')::boolean, true) and v_attend_amount > 0 then
    for v_attendee_user_id in
      select ra.user_id
      from public.ride_attendees ra
      where ra.ride_id = v_ride.id
        and ra.user_id <> v_ride.host_id
        and ra.status = 'going'
    loop
      perform public.award_crimson_credits(
        v_attendee_user_id,
        v_attend_amount,
        'meet_attended',
        'Attended a completed meet',
        'meet_attend:' || v_attendee_user_id::text || ':' || v_ride.id::text,
        jsonb_build_object('ride_id', v_ride.id, 'completed_at', v_ride.ended_at)
      );
    end loop;
  end if;
exception
  when others then
    raise warning 'meet completion credits failed for ride %: %', p_ride_id, sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin manual credit adjustment (add or remove; never below zero balance)
-- ---------------------------------------------------------------------------
create or replace function public.admin_adjust_crimson_credits(
  p_target_user_id uuid,
  p_amount integer,
  p_reason text,
  p_admin_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_row public.crimson_credits%rowtype;
  v_current_balance integer := 0;
  v_remove integer;
  v_meta jsonb;
begin
  if p_target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if p_admin_id is null then
    raise exception 'admin_id is required';
  end if;

  if p_amount is null or p_amount = 0 then
    raise exception 'amount must be non-zero';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason is required';
  end if;

  v_meta := coalesce(p_metadata, '{}'::jsonb)
    || jsonb_build_object('admin_id', p_admin_id);

  insert into public.crimson_credits (user_id, credits_balance, lifetime_credits_earned, lifetime_credits_spent)
  values (p_target_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;

  select * into v_balance_row
  from public.crimson_credits c
  where c.user_id = p_target_user_id;

  v_current_balance := coalesce(v_balance_row.credits_balance, 0);

  if p_amount > 0 then
    insert into public.crimson_credit_transactions (
      user_id,
      amount,
      transaction_type,
      reason,
      metadata
    )
    values (
      p_target_user_id,
      p_amount,
      'admin_adjustment',
      btrim(p_reason),
      v_meta || jsonb_build_object('direction', 'add')
    );

    update public.crimson_credits c
    set credits_balance = c.credits_balance + p_amount,
        lifetime_credits_earned = c.lifetime_credits_earned + p_amount
    where c.user_id = p_target_user_id
    returning * into v_balance_row;

    return jsonb_build_object(
      'ok', true,
      'direction', 'add',
      'amount', p_amount,
      'credits_balance', v_balance_row.credits_balance
    );
  end if;

  v_remove := abs(p_amount);

  if v_current_balance < v_remove then
    raise exception 'Cannot remove more credits than current balance (%).', v_current_balance;
  end if;

  insert into public.crimson_credit_transactions (
    user_id,
    amount,
    transaction_type,
    reason,
    metadata
  )
  values (
    p_target_user_id,
    -v_remove,
    'admin_adjustment',
    btrim(p_reason),
    v_meta || jsonb_build_object('direction', 'remove')
  );

  update public.crimson_credits c
  set credits_balance = c.credits_balance - v_remove,
      lifetime_credits_spent = c.lifetime_credits_spent + v_remove
  where c.user_id = p_target_user_id
  returning * into v_balance_row;

  return jsonb_build_object(
    'ok', true,
    'direction', 'remove',
    'amount', -v_remove,
    'credits_balance', v_balance_row.credits_balance
  );
end;
$$;

revoke all on function public.admin_adjust_crimson_credits(uuid, integer, text, uuid, jsonb) from public;
grant execute on function public.admin_adjust_crimson_credits(uuid, integer, text, uuid, jsonb) to service_role;
