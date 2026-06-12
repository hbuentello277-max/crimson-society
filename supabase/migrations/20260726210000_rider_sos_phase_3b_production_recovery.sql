-- Production recovery for Rider SOS Phase 3B.
--
-- Use when migration history shows 20260726180000 / 20260726190000 / 20260726200000
-- as applied but database objects are missing.
--
-- Likely missing objects (when 20260726190000 was marked applied without executing):
--   * public.rider_sos_responses (table)
--   * rider_sos_responses_one_per_rider (unique index)
--   * rider_sos_responses_event_active_idx (partial index)
--   * touch_rider_sos_responses_updated_at (trigger)
--   * cancel_rider_sos_responses_on_event_close (function + trigger on rider_sos_events)
--   * responder_bike_info(uuid)
--   * set_rider_sos_response(uuid, text)
--   * list_rider_sos_responders(uuid)
--   * get_my_rider_sos_response(uuid)
--   * list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) with responder_count
--   * RLS policies on rider_sos_responses (5 policies)
--   * table grants + function execute grants
--
-- Safe to re-run: uses IF NOT EXISTS, DROP IF EXISTS, CREATE OR REPLACE, and
-- DROP FUNCTION before recreating list_nearby_active_rider_sos_alerts.

create table if not exists public.rider_sos_responses (
  id uuid primary key default gen_random_uuid(),
  sos_event_id uuid not null references public.rider_sos_events(id) on delete cascade,
  responder_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'responding',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rider_sos_responses_status_check check (
    status in ('responding', 'arrived', 'cancelled')
  )
);

create unique index if not exists rider_sos_responses_one_per_rider
  on public.rider_sos_responses (sos_event_id, responder_user_id);

create index if not exists rider_sos_responses_event_active_idx
  on public.rider_sos_responses (sos_event_id, updated_at desc)
  where status in ('responding', 'arrived');

drop trigger if exists touch_rider_sos_responses_updated_at on public.rider_sos_responses;
create trigger touch_rider_sos_responses_updated_at
before update on public.rider_sos_responses
for each row execute function public.touch_updated_at();

alter table public.rider_sos_responses enable row level security;

drop policy if exists "Users insert own rider sos responses" on public.rider_sos_responses;
create policy "Users insert own rider sos responses"
on public.rider_sos_responses
for insert
to authenticated
with check (
  responder_user_id = auth.uid()
  and exists (
    select 1
    from public.rider_sos_events e
    where e.id = sos_event_id
      and e.status = 'active'
      and e.user_id is distinct from auth.uid()
  )
);

drop policy if exists "Users read own rider sos responses" on public.rider_sos_responses;
create policy "Users read own rider sos responses"
on public.rider_sos_responses
for select
to authenticated
using (responder_user_id = auth.uid());

drop policy if exists "SOS owners read rider sos responses" on public.rider_sos_responses;
create policy "SOS owners read rider sos responses"
on public.rider_sos_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.rider_sos_events e
    where e.id = sos_event_id
      and e.user_id = auth.uid()
  )
);

drop policy if exists "Admins read rider sos responses" on public.rider_sos_responses;
create policy "Admins read rider sos responses"
on public.rider_sos_responses
for select
to authenticated
using (
  public.is_profile_admin(auth.uid())
  or public.is_platform_owner(auth.uid())
);

drop policy if exists "Users update own rider sos responses" on public.rider_sos_responses;
create policy "Users update own rider sos responses"
on public.rider_sos_responses
for update
to authenticated
using (responder_user_id = auth.uid())
with check (responder_user_id = auth.uid());

revoke all on public.rider_sos_responses from anon;
grant select, insert, update on public.rider_sos_responses to authenticated;
grant all on public.rider_sos_responses to service_role;

create or replace function public.cancel_rider_sos_responses_on_event_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'active' and old.status = 'active' then
    update public.rider_sos_responses r
    set status = 'cancelled'
    where r.sos_event_id = new.id
      and r.status in ('responding', 'arrived');
  end if;

  return new;
end;
$$;

drop trigger if exists cancel_rider_sos_responses_on_event_close on public.rider_sos_events;
create trigger cancel_rider_sos_responses_on_event_close
after update of status on public.rider_sos_events
for each row execute function public.cancel_rider_sos_responses_on_event_close();

create or replace function public.responder_bike_info(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(trim(sp.bike_info), ''),
    nullif(trim(p.bike_type), '')
  )
  from public.profiles p
  left join public.rider_sos_profiles sp on sp.user_id = p.id
  where p.id = target_user_id;
$$;

create or replace function public.set_rider_sos_response(
  p_sos_event_id uuid,
  p_status text default 'responding'
)
returns public.rider_sos_responses
language plpgsql
security definer
set search_path = public
as $$
declare
  next_row public.rider_sos_responses;
begin
  if not public.is_active_user(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('responding', 'arrived', 'cancelled') then
    raise exception 'Invalid response status';
  end if;

  if not exists (
    select 1
    from public.rider_sos_events e
    where e.id = p_sos_event_id
      and e.status = 'active'
      and e.user_id is distinct from auth.uid()
  ) then
    raise exception 'SOS event is not available for response';
  end if;

  insert into public.rider_sos_responses (sos_event_id, responder_user_id, status)
  values (p_sos_event_id, auth.uid(), p_status)
  on conflict (sos_event_id, responder_user_id)
  do update
    set status = excluded.status,
        updated_at = now()
  returning * into next_row;

  return next_row;
end;
$$;

create or replace function public.list_rider_sos_responders(p_sos_event_id uuid)
returns table (
  id uuid,
  responder_user_id uuid,
  rider_name text,
  bike_info text,
  status text,
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

create or replace function public.get_my_rider_sos_response(p_sos_event_id uuid)
returns public.rider_sos_responses
language sql
stable
security definer
set search_path = public
as $$
  select r.*
  from public.rider_sos_responses r
  where r.sos_event_id = p_sos_event_id
    and r.responder_user_id = auth.uid()
  limit 1;
$$;

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

revoke all on function public.responder_bike_info(uuid) from public;
revoke all on function public.set_rider_sos_response(uuid, text) from public;
revoke all on function public.list_rider_sos_responders(uuid) from public;
revoke all on function public.get_my_rider_sos_response(uuid) from public;
revoke all on function public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) from public;

grant execute on function public.responder_bike_info(uuid) to authenticated;
grant execute on function public.set_rider_sos_response(uuid, text) to authenticated;
grant execute on function public.list_rider_sos_responders(uuid) to authenticated;
grant execute on function public.get_my_rider_sos_response(uuid) to authenticated;
grant execute on function public.list_nearby_active_rider_sos_alerts(numeric, numeric, numeric) to authenticated;

notify pgrst, 'reload schema';
