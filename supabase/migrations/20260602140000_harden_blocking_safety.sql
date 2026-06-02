-- Harden blocking across follows, meets, and notifications.

drop policy if exists "Users can join rides" on public.ride_attendees;
create policy "Users can join rides"
on public.ride_attendees
for insert
to authenticated
with check (
  user_id = auth.uid()
  and not exists (
    select 1
    from public.rides r
    where r.id = ride_id
      and public.users_are_blocked(auth.uid(), r.host_id)
  )
);

create or replace function public.create_profile_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  if public.users_are_blocked(new.follower_id, new.following_id) then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(new.follower_id), 'Crimson Member');

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    actor_id
  )
  values (
    new.following_id,
    'profile_followed',
    'New follower',
    actor_name || ' started following you.',
    new.follower_id
  );

  return new;
end;
$$;

create or replace function public.create_ride_attendance_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_ride_id uuid;
  target_user_id uuid;
  ride_host_id uuid;
  ride_name text;
  actor_name text;
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

  if public.users_are_blocked(target_user_id, ride_host_id) then
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
    and ra.user_id <> new.user_id
    and not public.users_are_blocked(ra.user_id, new.user_id);

  return new;
end;
$$;
