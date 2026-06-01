alter table public.rides
add column if not exists tracking_status text not null default 'not_started';

alter table public.rides
add column if not exists started_at timestamptz;

alter table public.rides
add column if not exists ended_at timestamptz;

update public.rides
set tracking_status = coalesce(tracking_status, 'not_started');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rides_tracking_status_check'
      and conrelid = 'public.rides'::regclass
  ) then
    alter table public.rides
    add constraint rides_tracking_status_check
    check (tracking_status in ('not_started', 'active', 'ended'));
  end if;
end $$;

create index if not exists rides_tracking_status_idx
on public.rides (tracking_status, started_at desc);

create or replace function public.stop_ride_live_locations_on_tracking_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tracking_status = 'ended'
    and old.tracking_status is distinct from new.tracking_status then
    update public.ride_live_locations
    set sharing_enabled = false,
        updated_at = coalesce(new.ended_at, now())
    where ride_id = new.id
      and sharing_enabled = true;
  end if;

  return new;
end;
$$;

drop trigger if exists stop_ride_live_locations_on_tracking_end on public.rides;
create trigger stop_ride_live_locations_on_tracking_end
after update of tracking_status on public.rides
for each row
execute function public.stop_ride_live_locations_on_tracking_end();

drop policy if exists "Ride viewers can read live locations" on public.ride_live_locations;
drop policy if exists "Users can insert own live location" on public.ride_live_locations;
drop policy if exists "Users can update own live location" on public.ride_live_locations;

create policy "Ride viewers can read live locations"
on public.ride_live_locations
for select
to authenticated
using (
  sharing_enabled = true
  and updated_at >= now() - interval '30 minutes'
  and exists (
    select 1
    from public.rides r
    where r.id = ride_live_locations.ride_id
      and r.status = 'active'
      and r.tracking_status = 'active'
      and (
        r.privacy = 'Open'
        or r.host_id = auth.uid()
        or exists (
          select 1
          from public.ride_attendees ra
          where ra.ride_id = r.id
            and ra.user_id = auth.uid()
        )
      )
  )
);

create policy "Users can insert own live location"
on public.ride_live_locations
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.rides r
    where r.id = ride_live_locations.ride_id
      and r.status = 'active'
      and r.tracking_status = 'active'
      and (
        r.host_id = auth.uid()
        or exists (
          select 1
          from public.ride_attendees ra
          where ra.ride_id = r.id
            and ra.user_id = auth.uid()
        )
      )
  )
);

create policy "Users can update own live location"
on public.ride_live_locations
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.rides r
    where r.id = ride_live_locations.ride_id
      and r.status = 'active'
      and r.tracking_status = 'active'
      and (
        r.host_id = auth.uid()
        or exists (
          select 1
          from public.ride_attendees ra
          where ra.ride_id = r.id
            and ra.user_id = auth.uid()
        )
      )
  )
);
