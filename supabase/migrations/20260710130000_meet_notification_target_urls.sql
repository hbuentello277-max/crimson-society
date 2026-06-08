-- Pre-merge polish: future meet notification deep links use /meets instead of /rides.
-- Legacy rows keep /rides URLs; app redirects cover them. No table or column renames.

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
  destination_url text;
begin
  if new.kind <> 'message' then
    return new;
  end if;

  select r.name
  into ride_name
  from public.rides r
  where r.id = new.ride_id;

  actor_name := coalesce(public.notification_actor_name(new.user_id), 'Crimson Member');
  destination_url := '/meets?meet=' || new.ride_id::text || '&section=chat';

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
    actor_id,
    target_url
  )
  select distinct
    ra.user_id,
    notification_type,
    notification_title,
    notification_body,
    new.ride_id,
    new.user_id,
    destination_url
  from public.ride_attendees ra
  where ra.ride_id = new.ride_id
    and ra.user_id <> new.user_id
    and not public.users_are_blocked(ra.user_id, new.user_id);

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
  end if;

  select r.host_id, r.name
  into ride_host_id, ride_name
  from public.rides r
  where r.id = target_ride_id;

  if ride_host_id is null then
    if tg_op = 'INSERT' then
      return new;
    end if;
    return old;
  end if;

  if tg_op = 'DELETE' then
    if target_user_id = ride_host_id then
      return old;
    end if;

    perform public.disable_ride_live_location_for_user(target_ride_id, target_user_id);

    if auth.uid() = target_user_id then
      notification_type := 'meet_left';
      notification_title := 'Rider left your meet';
      actor_name := coalesce(public.notification_actor_name(target_user_id), 'Crimson Member');
      notification_body := actor_name || ' left ' || coalesce(ride_name, 'your meet') || '.';

      perform public.upsert_grouped_notification(
        ride_host_id,
        notification_type,
        notification_title,
        notification_body,
        null,
        target_user_id,
        target_ride_id,
        null,
        null,
        null,
        null,
        '/meets?meet=' || target_ride_id::text,
        '/meets?meet=' || target_ride_id::text,
        '{}'::jsonb,
        notification_body,
        null
      );

      return old;
    end if;

    if auth.uid() = ride_host_id or public.is_profile_admin(auth.uid()) then
      actor_name := coalesce(public.notification_actor_name(auth.uid()), 'Meet host');
      notification_body := 'You were removed from ' || coalesce(ride_name, 'a meet') || '.';

      perform public.upsert_grouped_notification(
        target_user_id,
        'meet_removed',
        'Removed from meet',
        notification_body,
        null,
        auth.uid(),
        target_ride_id,
        null,
        null,
        null,
        null,
        '/meets?meet=' || target_ride_id::text,
        '/meets?meet=' || target_ride_id::text,
        '{}'::jsonb,
        notification_body,
        null
      );
    end if;

    return old;
  end if;

  if target_user_id = ride_host_id then
    return new;
  end if;

  if public.users_are_blocked(target_user_id, ride_host_id) then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(target_user_id), 'Crimson Member');
  notification_body := actor_name || ' joined ' || coalesce(ride_name, 'your meet') || '.';

  perform public.upsert_grouped_notification(
    ride_host_id,
    notification_type,
    notification_title,
    notification_body,
    'meet_joined:' || target_ride_id::text || ':' || ride_host_id::text,
    target_user_id,
    target_ride_id,
    null,
    null,
    null,
    null,
    '/meets?meet=' || target_ride_id::text,
    '/meets?meet=' || target_ride_id::text,
    '{}'::jsonb,
    actor_name,
    '{count} riders joined ' || coalesce(ride_name, 'your meet')
  );

  return new;
end;
$$;

create or replace function public.create_host_meet_subscriber_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_host_meet_subscribers(
    new.host_id,
    new.id,
    new.name,
    '/meets?meet=' || new.id::text
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
