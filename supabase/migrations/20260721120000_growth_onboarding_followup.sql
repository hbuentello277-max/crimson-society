-- Growth onboarding follow-up: ride completion rules + flexible referral codes.

-- ---------------------------------------------------------------------------
-- Referral code: allow A-Za-z0-9 . _ - with case-insensitive uniqueness
-- ---------------------------------------------------------------------------
create or replace function public.normalize_referral_code_lookup(p_code text)
returns text
language sql
immutable
as $$
  select upper(btrim(coalesce(p_code, '')));
$$;

create or replace function public.is_valid_referral_code_format(p_code text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_code text := btrim(coalesce(p_code, ''));
begin
  if char_length(v_code) < 3 or char_length(v_code) > 20 then
    return false;
  end if;

  if v_code ~ '\s' then
    return false;
  end if;

  if v_code !~ '^[A-Za-z0-9._-]+$' then
    return false;
  end if;

  if public.is_reserved_referral_code(public.normalize_referral_code_lookup(v_code)) then
    return false;
  end if;

  return true;
end;
$$;

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
    new.referral_code := btrim(new.referral_code);
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
    where public.normalize_referral_code_lookup(p.referral_code) = public.normalize_referral_code_lookup(candidate)
      and p.id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate := substr(base, 1, 10) || suffix::text;
  end loop;

  perform set_config('app.auto_referral_code', 'true', true);
  new.referral_code := candidate;
  return new;
end;
$$;

create or replace function public.attribute_referral(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := btrim(coalesce(p_referral_code, ''));
  v_lookup text := public.normalize_referral_code_lookup(v_code);
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
  where public.normalize_referral_code_lookup(p.referral_code) = v_lookup
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

  v_amount := greatest(0, coalesce((v_settings->>'referral_signup_credits')::integer, 25));

  v_award := public.award_crimson_credits(
    v_referrer_id,
    v_amount,
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

create or replace function public.set_own_referral_code(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := btrim(coalesce(p_referral_code, ''));
  v_lookup text := public.normalize_referral_code_lookup(v_code);
  v_existing text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_valid_referral_code_format(v_code) then
    return jsonb_build_object('ok', false, 'error', 'invalid_format');
  end if;

  select p.referral_code
  into v_existing
  from public.profiles p
  where p.id = v_user_id;

  if v_existing is not null
     and public.normalize_referral_code_lookup(v_existing) = v_lookup then
    return jsonb_build_object('ok', true, 'referral_code', v_existing);
  end if;

  if exists (
    select 1
    from public.profiles p
    where public.normalize_referral_code_lookup(p.referral_code) = v_lookup
      and p.id <> v_user_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_unique');
  end if;

  perform set_config('app.allow_referral_code_write', 'true', true);

  update public.profiles
  set referral_code = v_code
  where id = v_user_id;

  perform set_config('app.allow_referral_code_write', 'false', true);

  return jsonb_build_object('ok', true, 'referral_code', v_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- Rider onboarding: ride requires year + make/model (name field)
-- ---------------------------------------------------------------------------
create or replace function public.is_complete_rider_motorcycle(
  p_name text,
  p_year text
)
returns boolean
language sql
immutable
as $$
  select coalesce(btrim(p_name), '') <> ''
    and coalesce(btrim(p_year), '') <> '';
$$;

create or replace function public.get_rider_onboarding_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_profile_complete boolean := false;
  v_ride_added boolean := false;
  v_credits_awarded boolean := false;
  v_reward_amount integer;
  v_settings jsonb := public.crimson_credits_economy_settings();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_uid;

  if not found then
    raise exception 'Profile not found';
  end if;

  v_profile_complete :=
    coalesce(btrim(v_profile.username), '') <> ''
    and coalesce(btrim(v_profile.display_name), '') <> '';

  select exists (
    select 1
    from public.motorcycles m
    where m.user_id = v_uid
      and public.is_complete_rider_motorcycle(m.name, m.year)
  )
  into v_ride_added;

  select exists (
    select 1
    from public.crimson_credit_transactions t
    where t.user_id = v_uid
      and t.transaction_type = 'rider_onboarding'
      and t.amount > 0
  )
  into v_credits_awarded;

  v_reward_amount := greatest(0, coalesce((v_settings->>'rider_onboarding_credits')::integer, 100));

  return jsonb_build_object(
    'profile_complete', v_profile_complete,
    'ride_added', v_ride_added,
    'progress_percent', (
      (case when v_profile_complete then 50 else 0 end)
      + (case when v_ride_added then 50 else 0 end)
    ),
    'onboarding_complete', v_profile_complete and v_ride_added,
    'credits_awarded', v_credits_awarded,
    'reward_amount', v_reward_amount
  );
end;
$$;

notify pgrst, 'reload schema';
