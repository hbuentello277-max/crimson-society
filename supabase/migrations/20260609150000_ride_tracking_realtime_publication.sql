-- Enable Supabase Realtime for ride tracking lifecycle and live locations.

alter table public.rides replica identity full;
alter table public.ride_live_locations replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rides'
  ) then
    execute 'alter publication supabase_realtime add table public.rides';
  end if;

  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ride_live_locations'
  ) then
    execute 'alter publication supabase_realtime add table public.ride_live_locations';
  end if;
end;
$$;

notify pgrst, 'reload schema';
