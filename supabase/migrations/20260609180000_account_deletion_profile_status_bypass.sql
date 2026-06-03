-- Allow account-deletion RPCs to set profiles.status without opening self-service
-- privilege escalation. SECURITY DEFINER alone does not bypass BEFORE UPDATE triggers;
-- auth.uid() remains the caller, so prevent_profile_privilege_self_update blocked
-- status -> deletion_pending.

create or replace function public.prevent_profile_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deletion_override text := current_setting('app.account_deletion_status_override', true);
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role = coalesce(new.role, 'user');
    new.status = coalesce(new.status, 'active');
    new.is_admin = coalesce(new.is_admin, false);
    new.membership_status = coalesce(new.membership_status, 'inactive');

    if new.role <> 'user' or new.status <> 'active' or new.is_admin <> false then
      raise exception 'Profile role, status, and admin flags can only be set by admin controls.';
    end if;

    return new;
  end if;

  if auth.uid() = old.id then
    if deletion_override = 'request'
      and new.status = 'deletion_pending'
      and old.status not in ('deletion_pending', 'deleted')
      and new.role is not distinct from old.role
      and new.is_admin is not distinct from old.is_admin
      and new.membership_status is not distinct from old.membership_status
      and new.membership_tier is not distinct from old.membership_tier
    then
      return new;
    end if;

    if deletion_override = 'cancel'
      and old.status = 'deletion_pending'
      and new.status not in ('deletion_pending', 'deleted')
      and new.role is not distinct from old.role
      and new.is_admin is not distinct from old.is_admin
      and new.membership_status is not distinct from old.membership_status
      and new.membership_tier is not distinct from old.membership_tier
    then
      return new;
    end if;

    if new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.is_admin is distinct from old.is_admin
      or new.membership_status is distinct from old.membership_status
      or new.membership_tier is distinct from old.membership_tier
    then
      raise exception 'Profile privileged fields can only be changed by admin controls.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.request_account_deletion(p_confirmation text)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_existing public.account_deletion_requests;
  v_request public.account_deletion_requests;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if trim(coalesce(p_confirmation, '')) <> 'DELETE' then
    raise exception 'Type DELETE in the confirmation field to submit this request.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if v_profile.is_admin = true or v_profile.role = 'admin' then
    raise exception 'Admin accounts cannot be deleted through this flow.';
  end if;

  if v_profile.status = 'deletion_pending' then
    raise exception 'Account deletion is already pending.';
  end if;

  select *
  into v_existing
  from public.account_deletion_requests
  where user_id = v_user_id
    and status in ('pending', 'reviewing')
  order by requested_at desc
  limit 1;

  if found then
    raise exception 'An open deletion request already exists.';
  end if;

  insert into public.account_deletion_requests (
    user_id,
    status,
    details,
    signed_out_at,
    previous_status
  )
  values (
    v_user_id,
    'pending',
    'Requested via in-app account deletion.',
    v_now,
    coalesce(v_profile.status, 'active')
  )
  returning * into v_request;

  perform set_config('app.account_deletion_status_override', 'request', true);

  update public.profiles
  set status = 'deletion_pending',
      hide_from_suggestions = true,
      hide_location_from_suggestions = true
  where id = v_user_id;

  perform public.notify_admins_account_deletion_event(
    v_user_id,
    v_profile.username,
    'account_deletion_requested'
  );

  return v_request;
end;
$$;

create or replace function public.cancel_account_deletion_request()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_request public.account_deletion_requests;
  v_restore_status text;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if not found or v_profile.status <> 'deletion_pending' then
    raise exception 'No pending account deletion to cancel.';
  end if;

  select *
  into v_request
  from public.account_deletion_requests
  where user_id = v_user_id
    and status = 'pending'
  order by requested_at desc
  limit 1;

  if not found then
    raise exception 'No open deletion request found.';
  end if;

  v_restore_status := coalesce(nullif(v_request.previous_status, ''), 'active');

  update public.account_deletion_requests
  set status = 'canceled',
      reviewed_at = v_now
  where id = v_request.id;

  perform set_config('app.account_deletion_status_override', 'cancel', true);

  update public.profiles
  set status = v_restore_status,
      hide_from_suggestions = false,
      hide_location_from_suggestions = false
  where id = v_user_id;

  perform public.notify_admins_account_deletion_event(
    v_user_id,
    v_profile.username,
    'account_deletion_canceled'
  );

  return jsonb_build_object(
    'ok', true,
    'status', v_restore_status,
    'request_id', v_request.id
  );
end;
$$;

revoke all on function public.request_account_deletion(text) from public;
grant execute on function public.request_account_deletion(text) to authenticated;

revoke all on function public.cancel_account_deletion_request() from public;
grant execute on function public.cancel_account_deletion_request() to authenticated;

notify pgrst, 'reload schema';
