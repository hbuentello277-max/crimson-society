-- Crimson Credits Phase 4A: referral code security + user-managed codes.

-- ---------------------------------------------------------------------------
-- Validation helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_reserved_referral_code(p_code text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if v_code = '' then
    return true;
  end if;

  if v_code ~ '^(ADMIN|MOD|MODERATOR|SUPPORT|HELP|SYSTEM|ROOT|API|NULL|UNDEFINED|TEST|DEBUG|REF|REFERRAL|CRIMSON|BLACKCARD|SOCIETY|STAFF|OFFICIAL|FUCK|SHIT|ASS|NAZI|NIGGER|FAGGOT)' then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.is_valid_referral_code_format(p_code text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if char_length(v_code) < 3 or char_length(v_code) > 20 then
    return false;
  end if;

  if v_code !~ '^[A-Z0-9]+$' then
    return false;
  end if;

  if public.is_reserved_referral_code(v_code) then
    return false;
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Block client writes to referred_by_user_id (secure RPC only)
-- ---------------------------------------------------------------------------
create or replace function public.guard_referred_by_user_id()
returns trigger
language plpgsql
as $$
declare
  v_allowed boolean := coalesce(
    current_setting('app.allow_referred_by_attribution', true),
    ''
  ) = 'true';
begin
  if tg_op = 'INSERT' then
    if new.referred_by_user_id is not null and not v_allowed then
      raise exception 'Referral attribution must use the secure attribution flow.';
    end if;
    return new;
  end if;

  if new.referred_by_user_id is distinct from old.referred_by_user_id then
    if not v_allowed then
      raise exception 'Referral attribution must use the secure attribution flow.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_referred_by_user_id_before_write on public.profiles;
create trigger guard_referred_by_user_id_before_write
before insert or update on public.profiles
for each row execute function public.guard_referred_by_user_id();

-- Keep immutability + self-referral checks (runs after guard on referred_by updates)
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

-- ---------------------------------------------------------------------------
-- Block direct client writes to referral_code (set_own_referral_code RPC only)
-- ---------------------------------------------------------------------------
create or replace function public.guard_referral_code_write()
returns trigger
language plpgsql
as $$
declare
  v_allowed boolean := coalesce(
    current_setting('app.allow_referral_code_write', true),
    ''
  ) = 'true';
  v_auto boolean := coalesce(
    current_setting('app.auto_referral_code', true),
    ''
  ) = 'true';
begin
  if v_auto then
    perform set_config('app.auto_referral_code', 'false', true);
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.referral_code is not null and btrim(new.referral_code) <> '' and not v_allowed then
      raise exception 'Referral codes must be set through your profile settings.';
    end if;
    return new;
  end if;

  if new.referral_code is distinct from old.referral_code and not v_allowed then
    raise exception 'Referral codes must be set through your profile settings.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_referral_code_write_before_write on public.profiles;
create trigger guard_referral_code_write_before_write
before insert or update on public.profiles
for each row execute function public.guard_referral_code_write();

-- Auto-generation marks session flag so guard allows trigger writes
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

  perform set_config('app.auto_referral_code', 'true', true);
  new.referral_code := candidate;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Secure referral attribution (GUC-gated update)
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
-- User-managed referral code
-- ---------------------------------------------------------------------------
create or replace function public.set_own_referral_code(p_referral_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text := upper(btrim(coalesce(p_referral_code, '')));
  v_existing text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_valid_referral_code_format(v_code) then
    return jsonb_build_object('ok', false, 'error', 'invalid_format');
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.referral_code = v_code
      and p.id <> v_user_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'not_unique');
  end if;

  select p.referral_code into v_existing
  from public.profiles p
  where p.id = v_user_id;

  if v_existing = v_code then
    return jsonb_build_object('ok', true, 'referral_code', v_code);
  end if;

  perform set_config('app.allow_referral_code_write', 'true', true);

  update public.profiles
  set referral_code = v_code
  where id = v_user_id;

  perform set_config('app.allow_referral_code_write', 'false', true);

  return jsonb_build_object('ok', true, 'referral_code', v_code);
end;
$$;

revoke all on function public.set_own_referral_code(text) from public;
grant execute on function public.set_own_referral_code(text) to authenticated;

-- Generate a referral code for beta users who do not have one yet
create or replace function public.ensure_own_referral_code()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select p.referral_code into v_code
  from public.profiles p
  where p.id = v_user_id;

  if v_code is not null and btrim(v_code) <> '' then
    return jsonb_build_object('ok', true, 'referral_code', v_code);
  end if;

  update public.profiles
  set username = username
  where id = v_user_id;

  select p.referral_code into v_code
  from public.profiles p
  where p.id = v_user_id;

  if v_code is null or btrim(v_code) = '' then
    return jsonb_build_object('ok', false, 'error', 'could_not_generate');
  end if;

  return jsonb_build_object('ok', true, 'referral_code', v_code);
end;
$$;

revoke all on function public.ensure_own_referral_code() from public;
grant execute on function public.ensure_own_referral_code() to authenticated;
