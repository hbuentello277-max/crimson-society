create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in (
      'meet_joined',
      'meet_left',
      'meet_chat_message',
      'meet_chat_photo'
    )
  ),
  title text not null,
  body text not null,
  ride_id uuid references public.rides(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_created_idx
on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
on public.notifications (user_id, read_at)
where read_at is null;

drop policy if exists "Users can read own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;

create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own notifications"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.notification_actor_name(target_actor_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    nullif(trim(display_name), ''),
    nullif(trim(full_name), ''),
    nullif(trim(username), ''),
    'Crimson Member'
  )
  from public.profiles
  where id = target_actor_id
$$;

create or replace function public.create_ride_attendance_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ride_host_id uuid;
  ride_name text;
  actor_name text;
  target_ride_id uuid;
  target_user_id uuid;
  notification_type text;
  notification_title text;
  notification_body text;
begin
  if tg_op = 'INSERT' then
    target_ride_id := new.ride_id;
    target_user_id := new.user_id;
    notification_type := 'meet_joined';
    notification_title := 'Rider joined your meet';
  else
    target_ride_id := old.ride_id;
    target_user_id := old.user_id;
    notification_type := 'meet_left';
    notification_title := 'Rider left your meet';
  end if;

  select r.host_id, r.name
  into ride_host_id, ride_name
  from public.rides r
  where r.id = target_ride_id;

  if ride_host_id is null or target_user_id = ride_host_id then
    if tg_op = 'INSERT' then
      return new;
    end if;

    return old;
  end if;

  actor_name := coalesce(public.notification_actor_name(target_user_id), 'Crimson Member');
  notification_body := actor_name || case
    when notification_type = 'meet_joined' then ' joined '
    else ' left '
  end || coalesce(ride_name, 'your meet') || '.';

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    ride_id,
    actor_id
  )
  values (
    ride_host_id,
    notification_type,
    notification_title,
    notification_body,
    target_ride_id,
    target_user_id
  );

  if tg_op = 'INSERT' then
    return new;
  end if;

  return old;
end;
$$;

drop trigger if exists create_ride_attendance_notification_after_insert on public.ride_attendees;
create trigger create_ride_attendance_notification_after_insert
after insert on public.ride_attendees
for each row
execute function public.create_ride_attendance_notification();

drop trigger if exists create_ride_attendance_notification_after_delete on public.ride_attendees;
create trigger create_ride_attendance_notification_after_delete
after delete on public.ride_attendees
for each row
execute function public.create_ride_attendance_notification();

create or replace function public.create_ride_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ride_name text;
  actor_name text;
  notification_type text;
  notification_title text;
  notification_body text;
begin
  if new.kind <> 'message' then
    return new;
  end if;

  select r.name
  into ride_name
  from public.rides r
  where r.id = new.ride_id;

  actor_name := coalesce(public.notification_actor_name(new.user_id), 'Crimson Member');

  if new.media_url is not null then
    notification_type := 'meet_chat_photo';
    notification_title := 'New meet photo';
    notification_body := actor_name || ' shared a photo in ' || coalesce(ride_name, 'a meet') || '.';
  else
    notification_type := 'meet_chat_message';
    notification_title := 'New meet message';
    notification_body := actor_name || ' sent a message in ' || coalesce(ride_name, 'a meet') || '.';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    ride_id,
    actor_id
  )
  select distinct
    ra.user_id,
    notification_type,
    notification_title,
    notification_body,
    new.ride_id,
    new.user_id
  from public.ride_attendees ra
  where ra.ride_id = new.ride_id
    and ra.user_id <> new.user_id;

  return new;
end;
$$;

drop trigger if exists create_ride_message_notifications_after_insert on public.ride_messages;
create trigger create_ride_message_notifications_after_insert
after insert on public.ride_messages
for each row
execute function public.create_ride_message_notifications();

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
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;
