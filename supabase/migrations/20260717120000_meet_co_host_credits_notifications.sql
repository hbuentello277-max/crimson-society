-- Meet co-host support, co-host permissions, meet credit notifications, and co-host credits.

alter table public.rides
  add column if not exists co_host_id uuid references public.profiles(id) on delete set null;

alter table public.rides
  drop constraint if exists rides_co_host_not_host;

alter table public.rides
  add constraint rides_co_host_not_host
  check (co_host_id is null or co_host_id <> host_id);

create index if not exists rides_co_host_id_idx on public.rides (co_host_id)
where co_host_id is not null;

create or replace function public.is_meet_host_or_cohost(p_ride_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rides r
    where r.id = p_ride_id
      and (
        r.host_id = p_user_id
        or r.co_host_id = p_user_id
      )
  );
$$;

revoke all on function public.is_meet_host_or_cohost(uuid, uuid) from public;
grant execute on function public.is_meet_host_or_cohost(uuid, uuid) to authenticated;

drop policy if exists "Co-hosts can update own rides" on public.rides;
create policy "Co-hosts can update own rides"
on public.rides
for update
to authenticated
using (co_host_id = auth.uid())
with check (co_host_id = auth.uid());

drop policy if exists "Co-hosts can remove meet riders" on public.ride_attendees;
create policy "Co-hosts can remove meet riders"
on public.ride_attendees
for delete
to authenticated
using (
  user_id <> auth.uid()
  and exists (
    select 1
    from public.rides r
    where r.id = ride_attendees.ride_id
      and r.co_host_id = auth.uid()
      and r.status = 'active'
      and r.host_id <> ride_attendees.user_id
      and (r.co_host_id is null or r.co_host_id <> ride_attendees.user_id)
  )
);

create or replace function public.set_meet_co_host(
  target_ride_id uuid,
  target_co_host_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
begin
  if target_ride_id is null then
    return jsonb_build_object('ok', false, 'error', 'Meet is required.');
  end if;

  select * into v_ride
  from public.rides r
  where r.id = target_ride_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Meet not found.');
  end if;

  if v_ride.status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'error', 'Only active meets can update co-hosts.');
  end if;

  if v_ride.host_id <> auth.uid() and not public.is_profile_admin(auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'Only the primary host can manage co-hosts.');
  end if;

  if target_co_host_id is not null then
    if target_co_host_id = v_ride.host_id then
      return jsonb_build_object('ok', false, 'error', 'The primary host cannot be assigned as co-host.');
    end if;

    if not exists (
      select 1
      from public.profiles p
      where p.id = target_co_host_id
    ) then
      return jsonb_build_object('ok', false, 'error', 'Co-host profile not found.');
    end if;
  end if;

  update public.rides r
  set co_host_id = target_co_host_id
  where r.id = target_ride_id
    and r.host_id = v_ride.host_id;

  return jsonb_build_object('ok', true, 'co_host_id', target_co_host_id);
end;
$$;

revoke all on function public.set_meet_co_host(uuid, uuid) from public;
grant execute on function public.set_meet_co_host(uuid, uuid) to authenticated;

create or replace function public.notify_crimson_credits_meet_reward(
  p_user_id uuid,
  p_amount integer,
  p_ride_id uuid,
  p_meet_name text,
  p_role text,
  p_idempotency_key text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_destination_url text := '/profile/credits/history';
  v_title text := 'Crimson Credits earned';
  v_body text;
  v_group_key text;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    return;
  end if;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    return;
  end if;

  v_group_key := 'crimson_credits_reward:' || p_user_id::text || ':' || btrim(p_idempotency_key);

  if exists (
    select 1
    from public.notifications n
    where n.user_id = p_user_id
      and n.notification_group_key = v_group_key
  ) then
    return;
  end if;

  if p_role = 'attend' then
    v_body := 'You earned ' || p_amount::text || ' Crimson Credits for attending ' || coalesce(nullif(btrim(p_meet_name), ''), 'your meet') || '.';
  elsif p_role = 'cohost' then
    v_body := 'You earned ' || p_amount::text || ' Crimson Credits for co-hosting ' || coalesce(nullif(btrim(p_meet_name), ''), 'your meet') || '.';
  else
    v_body := 'You earned ' || p_amount::text || ' Crimson Credits for hosting ' || coalesce(nullif(btrim(p_meet_name), ''), 'your meet') || '.';
  end if;

  perform public.upsert_grouped_notification(
    p_user_id,
    'crimson_credits_reward',
    v_title,
    v_body,
    v_group_key,
    null,
    p_ride_id,
    null,
    null,
    null,
    null,
    v_destination_url,
    v_destination_url,
    jsonb_build_object(
      'entity_type', 'crimson_credits_reward',
      'entity_id', p_ride_id,
      'route', v_destination_url,
      'meet_id', p_ride_id,
      'amount', p_amount,
      'reason', p_reason,
      'credit_role', p_role,
      'idempotency_key', btrim(p_idempotency_key)
    ),
    v_body,
    null
  );
end;
$$;

revoke all on function public.notify_crimson_credits_meet_reward(uuid, integer, uuid, text, text, text, text) from public;

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
  v_host_key text;
  v_cohost_key text;
  v_attend_key text;
  v_award_result jsonb;
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
    and (v_ride.co_host_id is null or ra.user_id <> v_ride.co_host_id)
    and ra.status = 'going';

  if v_other_attendee_count < 1 then
    return;
  end if;

  v_host_amount := greatest(0, coalesce((v_settings->>'host_meet_credits')::integer, 20));
  v_attend_amount := greatest(0, coalesce((v_settings->>'attend_meet_credits')::integer, 10));
  v_host_key := 'meet_host:' || v_ride.host_id::text || ':' || v_ride.id::text;

  if coalesce((v_settings->>'earn_host_meet_enabled')::boolean, true) and v_host_amount > 0 then
    v_award_result := public.award_crimson_credits(
      v_ride.host_id,
      v_host_amount,
      'meet_hosted',
      'Hosted a completed meet',
      v_host_key,
      jsonb_build_object(
        'ride_id', v_ride.id,
        'completed_at', v_ride.ended_at,
        'other_attendee_count', v_other_attendee_count,
        'host_role', 'primary'
      )
    );

    if coalesce((v_award_result->>'awarded')::integer, 0) > 0
       and coalesce((v_award_result->>'duplicate')::boolean, false) = false then
      perform public.notify_crimson_credits_meet_reward(
        v_ride.host_id,
        (v_award_result->>'awarded')::integer,
        v_ride.id,
        v_ride.name,
        'host',
        v_host_key,
        'meet_hosted'
      );
    end if;
  end if;

  if v_ride.co_host_id is not null
     and coalesce((v_settings->>'earn_host_meet_enabled')::boolean, true)
     and v_host_amount > 0 then
    v_cohost_key := 'meet_cohost:' || v_ride.co_host_id::text || ':' || v_ride.id::text;
    v_award_result := public.award_crimson_credits(
      v_ride.co_host_id,
      v_host_amount,
      'meet_hosted',
      'Co-hosted a completed meet',
      v_cohost_key,
      jsonb_build_object(
        'ride_id', v_ride.id,
        'completed_at', v_ride.ended_at,
        'other_attendee_count', v_other_attendee_count,
        'host_role', 'cohost'
      )
    );

    if coalesce((v_award_result->>'awarded')::integer, 0) > 0
       and coalesce((v_award_result->>'duplicate')::boolean, false) = false then
      perform public.notify_crimson_credits_meet_reward(
        v_ride.co_host_id,
        (v_award_result->>'awarded')::integer,
        v_ride.id,
        v_ride.name,
        'cohost',
        v_cohost_key,
        'meet_hosted'
      );
    end if;
  end if;

  if coalesce((v_settings->>'earn_attend_meet_enabled')::boolean, true) and v_attend_amount > 0 then
    for v_attendee_user_id in
      select ra.user_id
      from public.ride_attendees ra
      where ra.ride_id = v_ride.id
        and ra.user_id <> v_ride.host_id
        and (v_ride.co_host_id is null or ra.user_id <> v_ride.co_host_id)
        and ra.status = 'going'
    loop
      v_attend_key := 'meet_attend:' || v_attendee_user_id::text || ':' || v_ride.id::text;
      v_award_result := public.award_crimson_credits(
        v_attendee_user_id,
        v_attend_amount,
        'meet_attended',
        'Attended a completed meet',
        v_attend_key,
        jsonb_build_object('ride_id', v_ride.id, 'completed_at', v_ride.ended_at)
      );

      if coalesce((v_award_result->>'awarded')::integer, 0) > 0
         and coalesce((v_award_result->>'duplicate')::boolean, false) = false then
        perform public.notify_crimson_credits_meet_reward(
          v_attendee_user_id,
          (v_award_result->>'awarded')::integer,
          v_ride.id,
          v_ride.name,
          'attend',
          v_attend_key,
          'meet_attended'
        );
      end if;
    end loop;
  end if;
exception
  when others then
    raise warning 'meet completion credits failed for ride %: %', p_ride_id, sqlerrm;
end;
$$;

create or replace function public.create_ride_attendance_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ride_host_id uuid;
  ride_co_host_id uuid;
  ride_name text;
  actor_name text;
  target_ride_id uuid;
  target_user_id uuid;
  notification_type text;
  notification_title text;
  notification_body text;
  destination_url text;
  notify_user_id uuid;
begin
  if tg_op = 'INSERT' then
    target_ride_id := new.ride_id;
    target_user_id := new.user_id;
    notification_type := 'meet_joined';
    notification_title := 'Rider joined your meet';
  else
    target_ride_id := old.ride_id;
    target_user_id := old.user_id;
  end if;

  destination_url := public.meet_notification_path(target_ride_id);

  select r.host_id, r.co_host_id, r.name
  into ride_host_id, ride_co_host_id, ride_name
  from public.rides r
  where r.id = target_ride_id;

  if ride_host_id is null then
    if tg_op = 'INSERT' then
      return new;
    end if;
    return old;
  end if;

  if tg_op = 'DELETE' then
    if target_user_id = ride_host_id or target_user_id = ride_co_host_id then
      return old;
    end if;

    perform public.disable_ride_live_location_for_user(target_ride_id, target_user_id);

    if auth.uid() = target_user_id then
      notification_type := 'meet_left';
      notification_title := 'Rider left your meet';
      actor_name := coalesce(public.notification_actor_name(target_user_id), 'Crimson Member');
      notification_body := actor_name || ' left ' || coalesce(ride_name, 'your meet') || '.';

      for notify_user_id in
        select distinct host_id
        from (
          values (ride_host_id), (ride_co_host_id)
        ) as hosts(host_id)
        where host_id is not null
      loop
        perform public.upsert_grouped_notification(
          notify_user_id,
          notification_type,
          notification_title,
          notification_body,
          'meet_left:' || target_ride_id::text || ':' || notify_user_id::text,
          target_user_id,
          target_ride_id,
          null,
          null,
          null,
          null,
          destination_url,
          destination_url,
          jsonb_build_object('entity_type', 'meet_left', 'entity_id', target_ride_id, 'route', destination_url),
          actor_name,
          '{count} riders left ' || coalesce(ride_name, 'your meet')
        );
      end loop;

      return old;
    end if;

    if auth.uid() = ride_host_id
       or auth.uid() = ride_co_host_id
       or public.is_profile_admin(auth.uid()) then
      actor_name := coalesce(public.notification_actor_name(auth.uid()), 'Meet host');
      notification_body := 'You were removed from ' || coalesce(ride_name, 'a meet') || '.';

      perform public.upsert_grouped_notification(
        target_user_id,
        'meet_removed',
        'Removed from meet',
        notification_body,
        'meet_removed:' || target_ride_id::text || ':' || target_user_id::text,
        auth.uid(),
        target_ride_id,
        null,
        null,
        null,
        null,
        destination_url,
        destination_url,
        jsonb_build_object('entity_type', 'meet_removed', 'entity_id', target_ride_id, 'route', destination_url),
        notification_body,
        null
      );

      return old;
    end if;

    return old;
  end if;

  if target_user_id = ride_host_id or target_user_id = ride_co_host_id then
    return new;
  end if;

  if public.users_are_blocked(target_user_id, ride_host_id) then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(target_user_id), 'Crimson Member');
  notification_body := actor_name || ' joined ' || coalesce(ride_name, 'your meet') || '.';

  for notify_user_id in
    select distinct host_id
    from (
      values (ride_host_id), (ride_co_host_id)
    ) as hosts(host_id)
    where host_id is not null
  loop
    perform public.upsert_grouped_notification(
      notify_user_id,
      notification_type,
      notification_title,
      notification_body,
      'meet_joined:' || target_ride_id::text || ':' || notify_user_id::text,
      target_user_id,
      target_ride_id,
      null,
      null,
      null,
      null,
      destination_url,
      destination_url,
      jsonb_build_object('entity_type', 'meet_joined', 'entity_id', target_ride_id, 'route', destination_url),
      actor_name,
      '{count} riders joined ' || coalesce(ride_name, 'your meet')
    );
  end loop;

  return new;
end;
$$;
