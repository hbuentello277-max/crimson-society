create or replace function public.add_ride_host_attendee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ride_attendees (ride_id, user_id, status)
  values (new.id, new.host_id, 'going')
  on conflict (ride_id, user_id)
  do update set status = 'going';

  return new;
end;
$$;

drop trigger if exists add_ride_host_attendee_after_insert on public.rides;
create trigger add_ride_host_attendee_after_insert
after insert on public.rides
for each row
execute function public.add_ride_host_attendee();

insert into public.ride_attendees (ride_id, user_id, status)
select r.id, r.host_id, 'going'
from public.rides r
where r.host_id is not null
on conflict (ride_id, user_id)
do update set status = 'going';

drop policy if exists "Users can delete own ride messages" on public.ride_messages;
drop policy if exists "Message authors and ride hosts can delete ride messages" on public.ride_messages;

create policy "Message authors and ride hosts can delete ride messages"
on public.ride_messages
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.rides r
    where r.id = ride_messages.ride_id
      and r.host_id = auth.uid()
  )
);

alter table public.ride_messages replica identity full;

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
      and tablename = 'ride_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.ride_messages';
  end if;
end;
$$;
