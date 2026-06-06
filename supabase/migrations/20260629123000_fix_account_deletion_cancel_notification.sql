-- Disambiguate account deletion cancellation notifications.
-- Production has both a three-argument and a four-argument helper; passing the
-- fourth argument prevents "function is not unique" during cancellation.

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
    'account_deletion_canceled',
    null::uuid
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

notify pgrst, 'reload schema';
