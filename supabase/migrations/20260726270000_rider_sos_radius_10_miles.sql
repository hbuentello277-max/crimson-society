-- Rider SOS radius hardening.
-- Nearby rider SOS alerts use a 10 mile default, backed by platform_settings
-- so production can tune the radius without changing application code.

insert into public.platform_settings (key, value)
values ('rider_sos', jsonb_build_object('nearby_radius_miles', 10))
on conflict (key) do update
set
  value = jsonb_set(
    coalesce(public.platform_settings.value, '{}'::jsonb),
    '{nearby_radius_miles}',
    '10'::jsonb,
    true
  ),
  updated_at = now();

create or replace function public.rider_sos_nearby_radius_miles()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with raw as (
    select nullif(value->>'nearby_radius_miles', '') as radius
    from public.platform_settings
    where key = 'rider_sos'
  )
  select coalesce(
    (
      select greatest(1::numeric, least(100::numeric, radius::numeric))
      from raw
      where radius ~ '^[0-9]+(\.[0-9]+)?$'
      limit 1
    ),
    10::numeric
  );
$$;

drop function if exists public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric);
drop function if exists public.get_active_rider_sos_alert(uuid);

create function public.list_nearby_active_rider_sos_alerts(
  p_viewer_lat numeric default null,
  p_viewer_lng numeric default null,
  p_radius_miles numeric default 10
)
returns table (
  id uuid,
  user_id uuid,
  rider_name text,
  rider_username text,
  sos_type text,
  status text,
  bike_info text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz,
  distance_miles numeric,
  responder_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with active_events as (
    select
      e.id,
      e.user_id,
      e.sos_type,
      e.status,
      e.bike_info,
      e.latitude,
      e.longitude,
      e.created_at,
      coalesce(
        nullif(trim(p.display_name), ''),
        nullif(trim(p.full_name), ''),
        'Crimson Rider'
      ) as rider_name,
      p.username as rider_username
    from public.rider_sos_events e
    inner join public.profiles p on p.id = e.user_id
    where e.status = 'active'
      and public.is_active_user(auth.uid())
      and e.user_id is distinct from auth.uid()
      and not public.users_are_blocked(auth.uid(), e.user_id)
  ),
  with_distance as (
    select
      active_events.*,
      public.haversine_distance_miles(
        p_viewer_lat,
        p_viewer_lng,
        active_events.latitude,
        active_events.longitude
      ) as distance_miles,
      (
        select count(*)::integer
        from public.rider_sos_responses r
        where r.sos_event_id = active_events.id
          and r.status in ('responding', 'arrived')
      ) as responder_count
    from active_events
    where p_viewer_lat is not null
      and p_viewer_lng is not null
      and active_events.latitude is not null
      and active_events.longitude is not null
  )
  select
    with_distance.id,
    with_distance.user_id,
    with_distance.rider_name,
    with_distance.rider_username,
    with_distance.sos_type,
    with_distance.status,
    with_distance.bike_info,
    with_distance.latitude,
    with_distance.longitude,
    with_distance.created_at,
    with_distance.distance_miles,
    with_distance.responder_count
  from with_distance
  where with_distance.distance_miles <= coalesce(
    nullif(p_radius_miles, 0),
    public.rider_sos_nearby_radius_miles()
  )
  order by with_distance.distance_miles asc nulls last, with_distance.created_at desc;
$$;

create function public.get_active_rider_sos_alert(
  p_event_id uuid,
  p_viewer_lat numeric default null,
  p_viewer_lng numeric default null,
  p_radius_miles numeric default 10
)
returns table (
  id uuid,
  user_id uuid,
  rider_name text,
  rider_username text,
  sos_type text,
  status text,
  bike_info text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz,
  distance_miles numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with active_event as (
    select
      e.id,
      e.user_id,
      e.sos_type,
      e.status,
      e.bike_info,
      e.latitude,
      e.longitude,
      e.created_at,
      coalesce(
        nullif(trim(p.display_name), ''),
        nullif(trim(p.full_name), ''),
        'Crimson Rider'
      ) as rider_name,
      p.username as rider_username,
      case
        when p_viewer_lat is not null
          and p_viewer_lng is not null
          and e.latitude is not null
          and e.longitude is not null
        then public.haversine_distance_miles(
          p_viewer_lat,
          p_viewer_lng,
          e.latitude,
          e.longitude
        )
        else null
      end as distance_miles
    from public.rider_sos_events e
    inner join public.profiles p on p.id = e.user_id
    where e.id = p_event_id
      and e.status = 'active'
      and public.is_active_user(auth.uid())
  )
  select
    active_event.id,
    active_event.user_id,
    active_event.rider_name,
    active_event.rider_username,
    active_event.sos_type,
    active_event.status,
    active_event.bike_info,
    active_event.latitude,
    active_event.longitude,
    active_event.created_at,
    active_event.distance_miles
  from active_event
  where active_event.user_id = auth.uid()
    or public.is_profile_admin(auth.uid())
    or public.is_platform_owner(auth.uid())
    or exists (
      select 1
      from public.rider_sos_responses r
      where r.sos_event_id = active_event.id
        and r.responder_user_id = auth.uid()
        and r.status in ('responding', 'arrived')
    )
    or (
      p_viewer_lat is not null
      and p_viewer_lng is not null
      and active_event.latitude is not null
      and active_event.longitude is not null
      and not public.users_are_blocked(auth.uid(), active_event.user_id)
      and active_event.distance_miles <= coalesce(
        nullif(p_radius_miles, 0),
        public.rider_sos_nearby_radius_miles()
      )
    );
$$;

create or replace function public.notify_nearby_riders_for_sos_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
  v_distance numeric;
  v_body text;
  v_admin_body text;
  v_radius_miles numeric := public.rider_sos_nearby_radius_miles();
begin
  if new.status is distinct from 'active' then
    return new;
  end if;

  v_admin_body := public.rider_sos_type_label(new.sos_type)
    || ' · '
    || case
      when new.latitude is not null and new.longitude is not null then 'Location shared'
      else 'No GPS attached'
    end;

  for v_recipient in
    select p.id as user_id
    from public.profiles p
    where p.id is distinct from new.user_id
      and public.is_active_user(p.id)
      and (
        public.is_profile_admin(p.id)
        or public.is_platform_owner(p.id)
      )
  loop
    perform public.try_insert_rider_sos_notification(
      new.id,
      'sos_activated',
      v_recipient.user_id,
      '🚨 Rider SOS Activated',
      v_admin_body,
      new.user_id
    );
  end loop;

  -- Nearby rider notifications require SOS GPS and a recent actively shared
  -- rider location. Riders without recent coordinates are not guessed nearby.
  if new.latitude is null or new.longitude is null then
    return new;
  end if;

  for v_recipient in
    with latest_locations as (
      select distinct on (ll.user_id)
        ll.user_id,
        ll.lat,
        ll.lng,
        ll.updated_at
      from public.ride_live_locations ll
      where ll.sharing_enabled = true
        and ll.updated_at >= now() - interval '30 minutes'
        and ll.user_id is distinct from new.user_id
      order by ll.user_id, ll.updated_at desc
    )
    select
      p.id as user_id,
      public.haversine_distance_miles(
        new.latitude,
        new.longitude,
        latest_locations.lat,
        latest_locations.lng
      ) as distance_miles
    from latest_locations
    inner join public.profiles p on p.id = latest_locations.user_id
    where public.is_active_user(p.id)
      and coalesce(p.push_notifications_enabled, true) = true
      and exists (
        select 1
        from public.user_push_tokens t
        where t.user_id = p.id
          and t.enabled = true
      )
      and not public.users_are_blocked(p.id, new.user_id)
      and public.haversine_distance_miles(
        new.latitude,
        new.longitude,
        latest_locations.lat,
        latest_locations.lng
      ) <= v_radius_miles
  loop
    v_distance := v_recipient.distance_miles;
    v_body := public.rider_sos_type_label(new.sos_type)
      || ' · '
      || public.rider_sos_push_distance_label(v_distance);

    perform public.try_insert_rider_sos_notification(
      new.id,
      'sos_activated',
      v_recipient.user_id,
      '🚨 Rider Needs Assistance',
      v_body,
      new.user_id
    );
  end loop;

  return new;
end;
$$;

revoke all on function public.rider_sos_nearby_radius_miles() from public;
revoke all on function public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) from public;
revoke all on function public.get_active_rider_sos_alert(uuid, numeric, numeric, numeric) from public;
revoke all on function public.notify_nearby_riders_for_sos_activation() from public;

grant execute on function public.rider_sos_nearby_radius_miles() to authenticated;
grant execute on function public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) to authenticated;
grant execute on function public.get_active_rider_sos_alert(uuid, numeric, numeric, numeric) to authenticated;

notify pgrst, 'reload schema';
