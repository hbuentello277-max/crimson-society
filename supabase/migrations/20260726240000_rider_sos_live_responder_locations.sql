-- Rider SOS Phase 4C: live responder location sharing.
--
-- Stores only the latest responder location per active SOS. No history is kept.
-- Reads are restricted to the SOS owner, the responder for their own row, and admins/owners.

create table if not exists public.rider_sos_responder_locations (
  id uuid primary key default gen_random_uuid(),
  sos_event_id uuid not null references public.rider_sos_events(id) on delete cascade,
  responder_user_id uuid not null references auth.users(id) on delete cascade,
  latitude numeric not null,
  longitude numeric not null,
  accuracy numeric,
  heading numeric,
  speed numeric,
  updated_at timestamptz not null default now(),
  unique (sos_event_id, responder_user_id)
);

create index if not exists rider_sos_responder_locations_event_idx
  on public.rider_sos_responder_locations (sos_event_id, updated_at desc);

create index if not exists rider_sos_responder_locations_user_idx
  on public.rider_sos_responder_locations (responder_user_id, updated_at desc);

alter table public.rider_sos_responder_locations enable row level security;

drop policy if exists "SOS owners read responder live locations" on public.rider_sos_responder_locations;
create policy "SOS owners read responder live locations"
on public.rider_sos_responder_locations
for select
to authenticated
using (
  exists (
    select 1
    from public.rider_sos_events e
    where e.id = sos_event_id
      and e.user_id = auth.uid()
      and e.status = 'active'
  )
);

drop policy if exists "Responders read own SOS live location" on public.rider_sos_responder_locations;
create policy "Responders read own SOS live location"
on public.rider_sos_responder_locations
for select
to authenticated
using (responder_user_id = auth.uid());

drop policy if exists "Admins read SOS responder live locations" on public.rider_sos_responder_locations;
create policy "Admins read SOS responder live locations"
on public.rider_sos_responder_locations
for select
to authenticated
using (
  public.is_profile_admin(auth.uid())
  or public.is_platform_owner(auth.uid())
);

revoke all on public.rider_sos_responder_locations from anon, authenticated;
grant select on public.rider_sos_responder_locations to authenticated;
grant all on public.rider_sos_responder_locations to service_role;

create or replace function public.publish_rider_sos_responder_location(
  p_sos_event_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy numeric default null,
  p_heading numeric default null,
  p_speed numeric default null
)
returns public.rider_sos_responder_locations
language plpgsql
security definer
set search_path = public
as $$
declare
  next_row public.rider_sos_responder_locations;
begin
  if not public.is_active_user(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  if p_sos_event_id is null
     or p_latitude is null
     or p_longitude is null
     or p_latitude < -90
     or p_latitude > 90
     or p_longitude < -180
     or p_longitude > 180 then
    raise exception 'Valid responder location is required';
  end if;

  if not exists (
    select 1
    from public.rider_sos_events e
    inner join public.rider_sos_responses r on r.sos_event_id = e.id
    where e.id = p_sos_event_id
      and e.status = 'active'
      and e.user_id is distinct from auth.uid()
      and r.responder_user_id = auth.uid()
      and r.status = 'responding'
  ) then
    raise exception 'SOS response is not active for live location sharing';
  end if;

  insert into public.rider_sos_responder_locations (
    sos_event_id,
    responder_user_id,
    latitude,
    longitude,
    accuracy,
    heading,
    speed,
    updated_at
  )
  values (
    p_sos_event_id,
    auth.uid(),
    p_latitude,
    p_longitude,
    p_accuracy,
    p_heading,
    p_speed,
    now()
  )
  on conflict (sos_event_id, responder_user_id)
  do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        accuracy = excluded.accuracy,
        heading = excluded.heading,
        speed = excluded.speed,
        updated_at = now()
  returning * into next_row;

  return next_row;
end;
$$;

create or replace function public.clear_rider_sos_responder_location(p_sos_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user(auth.uid()) then
    return;
  end if;

  delete from public.rider_sos_responder_locations l
  where l.sos_event_id = p_sos_event_id
    and l.responder_user_id = auth.uid();
end;
$$;

create or replace function public.list_rider_sos_responder_locations(p_sos_event_id uuid)
returns table (
  id uuid,
  sos_event_id uuid,
  responder_user_id uuid,
  rider_name text,
  bike_info text,
  status text,
  latitude numeric,
  longitude numeric,
  accuracy numeric,
  heading numeric,
  speed numeric,
  distance_miles numeric,
  eta_minutes integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    l.id,
    l.sos_event_id,
    l.responder_user_id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      'Crimson Rider'
    ) as rider_name,
    public.responder_bike_info(l.responder_user_id) as bike_info,
    r.status,
    l.latitude,
    l.longitude,
    l.accuracy,
    l.heading,
    l.speed,
    case
      when e.latitude is not null and e.longitude is not null then
        public.haversine_distance_miles(l.latitude, l.longitude, e.latitude, e.longitude)
      else r.distance_miles
    end as distance_miles,
    case
      when e.latitude is not null and e.longitude is not null then
        public.estimate_rider_sos_eta_minutes(
          public.haversine_distance_miles(l.latitude, l.longitude, e.latitude, e.longitude)
        )
      else r.eta_minutes
    end as eta_minutes,
    l.updated_at
  from public.rider_sos_responder_locations l
  inner join public.rider_sos_events e on e.id = l.sos_event_id
  inner join public.rider_sos_responses r
    on r.sos_event_id = l.sos_event_id
   and r.responder_user_id = l.responder_user_id
  inner join public.profiles p on p.id = l.responder_user_id
  where l.sos_event_id = p_sos_event_id
    and e.status = 'active'
    and r.status = 'responding'
    and public.is_active_user(auth.uid())
    and (
      e.user_id = auth.uid()
      or l.responder_user_id = auth.uid()
      or public.is_profile_admin(auth.uid())
      or public.is_platform_owner(auth.uid())
    )
  order by l.updated_at desc;
$$;

create or replace function public.clear_rider_sos_responder_location_on_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'responding' then
    delete from public.rider_sos_responder_locations l
    where l.sos_event_id = new.sos_event_id
      and l.responder_user_id = new.responder_user_id;
  end if;

  return new;
end;
$$;

create or replace function public.clear_rider_sos_responder_locations_on_event_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'active' and old.status = 'active' then
    delete from public.rider_sos_responder_locations l
    where l.sos_event_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists clear_rider_sos_responder_location_on_status on public.rider_sos_responses;
create trigger clear_rider_sos_responder_location_on_status
after insert or update of status on public.rider_sos_responses
for each row execute function public.clear_rider_sos_responder_location_on_status();

drop trigger if exists clear_rider_sos_responder_locations_on_event_close on public.rider_sos_events;
create trigger clear_rider_sos_responder_locations_on_event_close
after update of status on public.rider_sos_events
for each row execute function public.clear_rider_sos_responder_locations_on_event_close();

revoke all on function public.publish_rider_sos_responder_location(uuid, numeric, numeric, numeric, numeric, numeric) from public;
revoke all on function public.clear_rider_sos_responder_location(uuid) from public;
revoke all on function public.list_rider_sos_responder_locations(uuid) from public;
revoke all on function public.clear_rider_sos_responder_location_on_status() from public;
revoke all on function public.clear_rider_sos_responder_locations_on_event_close() from public;

grant execute on function public.publish_rider_sos_responder_location(uuid, numeric, numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.clear_rider_sos_responder_location(uuid) to authenticated;
grant execute on function public.list_rider_sos_responder_locations(uuid) to authenticated;

notify pgrst, 'reload schema';

