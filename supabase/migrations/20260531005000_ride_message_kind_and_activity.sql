alter table public.ride_messages
add column if not exists kind text not null default 'message';

alter table public.ride_messages
drop constraint if exists ride_messages_kind_check;

alter table public.ride_messages
add constraint ride_messages_kind_check
check (kind in ('message', 'system'));

drop policy if exists "Joined riders can send ride messages" on public.ride_messages;

create policy "Joined riders can send ride messages"
on public.ride_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and kind = 'message'
  and (
    exists (
      select 1
      from public.ride_attendees ra
      where ra.ride_id = ride_messages.ride_id
        and ra.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.rides r
      where r.id = ride_messages.ride_id
        and r.host_id = auth.uid()
    )
  )
);

create or replace function public.log_ride_attendance_activity(
  target_ride_id uuid,
  activity text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_name text;
  activity_body text;
begin
  if actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if activity not in ('joined', 'left') then
    raise exception 'Unsupported ride activity';
  end if;

  if not exists (
    select 1
    from public.rides r
    where r.id = target_ride_id
      and r.status = 'active'
  ) then
    raise exception 'Ride is not active';
  end if;

  if not exists (
    select 1
    from public.ride_attendees ra
    where ra.ride_id = target_ride_id
      and ra.user_id = actor_id
  )
  and not exists (
    select 1
    from public.rides r
    where r.id = target_ride_id
      and r.host_id = actor_id
  ) then
    raise exception 'Not a ride attendee';
  end if;

  select coalesce(
    nullif(trim(display_name), ''),
    nullif(trim(full_name), ''),
    nullif(trim(username), ''),
    'Crimson Member'
  )
  into actor_name
  from public.profiles
  where id = actor_id;

  actor_name := coalesce(actor_name, 'Crimson Member');
  activity_body := actor_name || case
    when activity = 'joined' then ' joined the meet.'
    else ' left the meet.'
  end;

  insert into public.ride_messages (ride_id, user_id, body, kind)
  values (target_ride_id, actor_id, activity_body, 'system');
end;
$$;

grant execute on function public.log_ride_attendance_activity(uuid, text) to authenticated;
