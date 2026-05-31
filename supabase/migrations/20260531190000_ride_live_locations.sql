create table if not exists public.ride_live_locations (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  speed double precision,
  sharing_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (ride_id, user_id)
);

alter table public.ride_live_locations add column if not exists id uuid default gen_random_uuid();
alter table public.ride_live_locations add column if not exists sharing_enabled boolean not null default true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ride_live_locations'
      and column_name = 'ride_id'
      and data_type = 'text'
  ) then
    alter table public.ride_live_locations
    alter column ride_id type uuid using ride_id::uuid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ride_live_locations_ride_id_fkey'
      and conrelid = 'public.ride_live_locations'::regclass
  ) then
    alter table public.ride_live_locations
    add constraint ride_live_locations_ride_id_fkey
    foreign key (ride_id) references public.rides(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ride_live_locations_user_id_fkey'
      and conrelid = 'public.ride_live_locations'::regclass
  ) then
    alter table public.ride_live_locations
    add constraint ride_live_locations_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ride_live_locations_ride_id_user_id_key'
      and conrelid = 'public.ride_live_locations'::regclass
  ) then
    alter table public.ride_live_locations
    add constraint ride_live_locations_ride_id_user_id_key unique (ride_id, user_id);
  end if;
end $$;

create index if not exists ride_live_locations_ride_updated_idx
on public.ride_live_locations (ride_id, updated_at desc);

create index if not exists ride_live_locations_user_idx
on public.ride_live_locations (user_id);

alter table public.ride_live_locations enable row level security;

drop policy if exists "Ride viewers can read live locations" on public.ride_live_locations;
drop policy if exists "Users can insert own live location" on public.ride_live_locations;
drop policy if exists "Users can update own live location" on public.ride_live_locations;
drop policy if exists "Users can delete own live location" on public.ride_live_locations;

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

create policy "Users can delete own live location"
on public.ride_live_locations
for delete
to authenticated
using (user_id = auth.uid());
