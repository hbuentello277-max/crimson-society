-- Rider SOS Phase 4B: one-time responder ETA estimate.
--
-- Stores responder location only when voluntarily captured during "I'm Responding".
-- Location is used to compute approximate distance/ETA and is not exposed by
-- responder list RPCs.

alter table public.rider_sos_responses
  add column if not exists responder_latitude numeric,
  add column if not exists responder_longitude numeric,
  add column if not exists responder_location_accuracy numeric,
  add column if not exists distance_miles numeric,
  add column if not exists eta_minutes integer;

create or replace function public.estimate_rider_sos_eta_minutes(p_distance_miles numeric)
returns integer
language sql
immutable
as $$
  select case
    when p_distance_miles is null or p_distance_miles < 0 then null
    when p_distance_miles = 0 then 1
    else greatest(1, ceil((p_distance_miles / 15.0) * 60.0)::integer)
  end;
$$;

drop function if exists public.set_rider_sos_response(uuid, text);

create or replace function public.set_rider_sos_response(
  p_sos_event_id uuid,
  p_status text default 'responding',
  p_responder_latitude numeric default null,
  p_responder_longitude numeric default null,
  p_responder_location_accuracy numeric default null
)
returns public.rider_sos_responses
language plpgsql
security definer
set search_path = public
as $$
declare
  next_row public.rider_sos_responses;
  v_event public.rider_sos_events%rowtype;
  v_existing public.rider_sos_responses%rowtype;
  v_distance numeric := null;
  v_eta integer := null;
begin
  if not public.is_active_user(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('responding', 'arrived', 'cancelled') then
    raise exception 'Invalid response status';
  end if;

  select *
  into v_event
  from public.rider_sos_events e
  where e.id = p_sos_event_id
    and e.status = 'active'
    and e.user_id is distinct from auth.uid();

  if not found then
    raise exception 'SOS event is not available for response';
  end if;

  select *
  into v_existing
  from public.rider_sos_responses r
  where r.sos_event_id = p_sos_event_id
    and r.responder_user_id = auth.uid()
  limit 1;

  if p_responder_latitude is not null
     and p_responder_longitude is not null
     and v_event.latitude is not null
     and v_event.longitude is not null then
    v_distance := public.haversine_distance_miles(
      p_responder_latitude,
      p_responder_longitude,
      v_event.latitude,
      v_event.longitude
    );
    v_eta := public.estimate_rider_sos_eta_minutes(v_distance);
  else
    v_distance := v_existing.distance_miles;
    v_eta := v_existing.eta_minutes;
  end if;

  insert into public.rider_sos_responses (
    sos_event_id,
    responder_user_id,
    status,
    responder_latitude,
    responder_longitude,
    responder_location_accuracy,
    distance_miles,
    eta_minutes
  )
  values (
    p_sos_event_id,
    auth.uid(),
    p_status,
    p_responder_latitude,
    p_responder_longitude,
    p_responder_location_accuracy,
    v_distance,
    v_eta
  )
  on conflict (sos_event_id, responder_user_id)
  do update
    set status = excluded.status,
        responder_latitude = coalesce(excluded.responder_latitude, public.rider_sos_responses.responder_latitude),
        responder_longitude = coalesce(excluded.responder_longitude, public.rider_sos_responses.responder_longitude),
        responder_location_accuracy = coalesce(excluded.responder_location_accuracy, public.rider_sos_responses.responder_location_accuracy),
        distance_miles = coalesce(excluded.distance_miles, public.rider_sos_responses.distance_miles),
        eta_minutes = coalesce(excluded.eta_minutes, public.rider_sos_responses.eta_minutes),
        updated_at = now()
  returning * into next_row;

  return next_row;
end;
$$;

drop function if exists public.list_rider_sos_responders(uuid);

create or replace function public.list_rider_sos_responders(p_sos_event_id uuid)
returns table (
  id uuid,
  responder_user_id uuid,
  rider_name text,
  bike_info text,
  status text,
  distance_miles numeric,
  eta_minutes integer,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.responder_user_id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      'Crimson Rider'
    ) as rider_name,
    public.responder_bike_info(r.responder_user_id) as bike_info,
    r.status,
    r.distance_miles,
    r.eta_minutes,
    r.created_at,
    r.updated_at
  from public.rider_sos_responses r
  inner join public.profiles p on p.id = r.responder_user_id
  where r.sos_event_id = p_sos_event_id
    and r.status in ('responding', 'arrived')
    and public.is_active_user(auth.uid())
    and (
      exists (
        select 1
        from public.rider_sos_events e
        where e.id = p_sos_event_id
          and e.user_id = auth.uid()
      )
      or public.is_profile_admin(auth.uid())
      or public.is_platform_owner(auth.uid())
    )
  order by
    case r.status when 'arrived' then 0 when 'responding' then 1 else 2 end,
    r.updated_at desc;
$$;

revoke all on function public.estimate_rider_sos_eta_minutes(numeric) from public;
revoke all on function public.set_rider_sos_response(uuid, text, numeric, numeric, numeric) from public;
revoke all on function public.list_rider_sos_responders(uuid) from public;

grant execute on function public.estimate_rider_sos_eta_minutes(numeric) to authenticated, service_role;
grant execute on function public.set_rider_sos_response(uuid, text, numeric, numeric, numeric) to authenticated;
grant execute on function public.list_rider_sos_responders(uuid) to authenticated;

notify pgrst, 'reload schema';

