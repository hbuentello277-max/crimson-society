-- Repair for 20260726190000_fix_rider_sos_responses_repair.sql.
-- PostgreSQL cannot CREATE OR REPLACE when RETURNS TABLE columns change.
-- Phase 3A defined list_nearby_active_rider_sos_alerts without responder_count;
-- Phase 3B adds responder_count integer.
--
-- If 20260726190000 failed on this function, mark it applied then push:
--   supabase migration repair --status applied 20260726190000
--   supabase db push

drop function if exists public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric);

create function public.list_nearby_active_rider_sos_alerts(
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
      end as distance_miles,
      (
        select count(*)::integer
        from public.rider_sos_responses r
        where r.sos_event_id = active_events.id
          and r.status in ('responding', 'arrived')
      ) as responder_count
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
    with_distance.distance_miles,
    with_distance.responder_count
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

revoke all on function public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) from public;
grant execute on function public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) to authenticated;

notify pgrst, 'reload schema';
