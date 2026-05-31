update public.ride_live_locations
set id = gen_random_uuid()
where id is null;

alter table public.ride_live_locations
alter column id set not null;

create unique index if not exists ride_live_locations_id_key
on public.ride_live_locations (id);
