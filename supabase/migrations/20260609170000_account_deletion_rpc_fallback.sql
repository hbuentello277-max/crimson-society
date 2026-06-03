-- Account deletion + admin meet delete without requiring SUPABASE_SERVICE_ROLE_KEY
-- for flows that can run under authenticated RLS or security-definer RPCs.

create or replace function public.notify_admins_account_deletion_event(
  p_actor_user_id uuid,
  p_username text,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_row record;
  handle text;
  title_text text;
  body_text text;
begin
  if p_kind not in (
    'account_deletion_requested',
    'account_deletion_canceled',
    'account_deletion_approved'
  ) then
    raise exception 'Invalid deletion notification kind.';
  end if;

  handle := coalesce(nullif(trim(both '@' from coalesce(p_username, '')), ''), 'member');
  if left(handle, 1) <> '@' then
    handle := '@' || handle;
  end if;

  case p_kind
    when 'account_deletion_requested' then
      title_text := 'Account deletion requested';
      body_text := format('User %s submitted an account deletion request.', handle);
    when 'account_deletion_canceled' then
      title_text := 'Account deletion canceled';
      body_text := format('User %s cancelled their account deletion request.', handle);
    when 'account_deletion_approved' then
      title_text := 'Account deletion approved';
      body_text := format('Account deletion was approved for %s.', handle);
  end case;

  for admin_row in
    select id
    from public.profiles
    where status = 'active'
      and (is_admin = true or role = 'admin')
      and id <> p_actor_user_id
  loop
    if not exists (
      select 1
      from public.notifications n
      where n.user_id = admin_row.id
        and n.type = p_kind
        and n.actor_id = p_actor_user_id
        and n.created_at >= now() - interval '5 minutes'
    ) then
      insert into public.notifications (user_id, type, title, body, actor_id)
      values (admin_row.id, p_kind, title_text, body_text, p_actor_user_id);
    end if;
  end loop;
end;
$$;

revoke all on function public.notify_admins_account_deletion_event(uuid, text, text) from public;
grant execute on function public.notify_admins_account_deletion_event(uuid, text, text) to authenticated;

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

revoke all on function public.request_account_deletion(text) from public;
grant execute on function public.request_account_deletion(text) to authenticated;

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

revoke all on function public.cancel_account_deletion_request() from public;
grant execute on function public.cancel_account_deletion_request() to authenticated;

create or replace function public.admin_delete_ride(p_ride_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  if not public.is_profile_admin(auth.uid()) then
    raise exception 'Admins only.';
  end if;

  select *
  into v_ride
  from public.rides
  where id = p_ride_id;

  if not found then
    raise exception 'Meet not found.';
  end if;

  delete from public.rides
  where id = p_ride_id;

  return jsonb_build_object(
    'ok', true,
    'id', p_ride_id,
    'name', coalesce(v_ride.name, 'Untitled')
  );
end;
$$;

revoke all on function public.admin_delete_ride(uuid) from public;
grant execute on function public.admin_delete_ride(uuid) to authenticated;

notify pgrst, 'reload schema';
