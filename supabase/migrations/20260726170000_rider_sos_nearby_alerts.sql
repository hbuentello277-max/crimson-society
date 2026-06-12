-- Rider SOS Phase 3A: nearby rider awareness (sanitized RPCs; no sensitive fields).

create or replace function public.haversine_distance_miles(
  lat1 numeric,
  lng1 numeric,
  lat2 numeric,
  lng2 numeric
)
returns numeric
language sql
immutable
as $$
  select (
    3958.7613 * 2 * asin(
      sqrt(
        power(sin(radians((lat2::float8 - lat1::float8) / 2)), 2) +
        cos(radians(lat1::float8)) * cos(radians(lat2::float8)) *
        power(sin(radians((lng2::float8 - lng1::float8) / 2)), 2)
      )
    )
  )::numeric;
$$;

create or replace function public.list_nearby_active_rider_sos_alerts(
  p_viewer_lat numeric default null,
  p_viewer_lng numeric default null,
  p_radius_miles numeric default 5
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
  ),
  with_distance as (
    select
      active_events.*,
      case
        when active_events.latitude is not null
          and active_events.longitude is not null
          and p_viewer_lat is not null
          and p_viewer_lng is not null
        then public.haversine_distance_miles(
          p_viewer_lat,
          p_viewer_lng,
          active_events.latitude,
          active_events.longitude
        )
        else null
      end as distance_miles
    from active_events
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
    with_distance.distance_miles
  from with_distance
  where
    case
      when p_viewer_lat is not null and p_viewer_lng is not null then
        with_distance.latitude is not null
        and with_distance.longitude is not null
        and with_distance.distance_miles <= p_radius_miles
      else true
    end
  order by with_distance.distance_miles asc nulls last, with_distance.created_at desc;
$$;

create or replace function public.get_active_rider_sos_alert(p_event_id uuid)
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
  select
    e.id,
    e.user_id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      'Crimson Rider'
    ) as rider_name,
    p.username as rider_username,
    e.sos_type,
    e.status,
    e.bike_info,
    e.latitude,
    e.longitude,
    e.created_at,
    null::numeric as distance_miles
  from public.rider_sos_events e
  inner join public.profiles p on p.id = e.user_id
  where e.id = p_event_id
    and e.status = 'active'
    and public.is_active_user(auth.uid());
$$;

revoke all on function public.haversine_distance_miles(numeric, numeric, numeric, numeric) from public;
revoke all on function public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) from public;
revoke all on function public.get_active_rider_sos_alert(uuid) from public;

grant execute on function public.haversine_distance_miles(numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) to authenticated;
grant execute on function public.get_active_rider_sos_alert(uuid) to authenticated;

notify pgrst, 'reload schema';
