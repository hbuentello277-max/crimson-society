-- Full notification reliability: grouped meet chat, lifecycle deep links, DM path URLs.

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'meet_joined',
    'meet_left',
    'meet_chat_message',
    'meet_chat_photo',
    'profile_followed',
    'follow',
    'meet_removed',
    'meet_canceled',
    'meet_cancelled',
    'meet_updated',
    'meet_ended',
    'meet_reminder',
    'direct_message',
    'new_conversation',
    'connection_request',
    'connection_request_received',
    'connection_accepted',
    'post_liked',
    'post_like',
    'post_commented',
    'post_comment',
    'favorite_rider_meet',
    'favorite_rider_post',
    'favorite_rider_ride_started',
    'host_meet_created',
    'shop_order_paid',
    'shop_order_confirmed',
    'shop_order_ready',
    'shop_order_ready_for_pickup',
    'shop_order_shipped',
    'order_created',
    'order_confirmed',
    'order_preparing',
    'order_ready_to_ship',
    'order_shipped',
    'order_ready_for_pickup',
    'order_delivered',
    'order_completed',
    'admin_order_created',
    'admin_order_paid',
    'admin_order_placed',
    'admin_low_inventory',
    'admin_report_submitted',
    'account_deletion_requested',
    'account_deletion_canceled',
    'account_deletion_approved',
    'blackcard_announcement',
    'crimson_credits_reward',
    'event_announcement'
  )
);

create or replace function public.meet_notification_path(p_meet_id uuid, p_section text default null)
returns text
language sql
immutable
as $$
  select case
    when p_section is not null and btrim(p_section) <> '' then '/meets/' || p_meet_id::text || '?section=' || p_section
    else '/meets/' || p_meet_id::text
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
  single_body text;
  grouped_body text;
  preview text;
  destination_url text;
  recipient record;
begin
  if new.kind <> 'message' then
    return new;
  end if;

  select r.name
  into ride_name
  from public.rides r
  where r.id = new.ride_id;

  actor_name := coalesce(public.notification_actor_name(new.user_id), 'Crimson Member');
  destination_url := public.meet_notification_path(new.ride_id, 'chat');
  preview := left(trim(coalesce(new.body, '')), 120);

  if new.media_url is not null then
    notification_type := 'meet_chat_photo';
    notification_title := 'New meet photo';
    single_body := actor_name || ' shared a photo in ' || coalesce(ride_name, 'a meet') || '.';
    grouped_body := '{count} new photos in meet chat';
  else
    notification_type := 'meet_chat_message';
    notification_title := 'New meet message';
    single_body := actor_name || ' sent a message in ' || coalesce(ride_name, 'a meet') || '.';
    grouped_body := '{count} new messages in meet chat';
  end if;

  for recipient in
    select ra.user_id
    from public.ride_attendees ra
    where ra.ride_id = new.ride_id
      and ra.user_id <> new.user_id
      and not public.users_are_blocked(ra.user_id, new.user_id)
  loop
    perform public.upsert_grouped_notification(
      recipient.user_id,
      notification_type,
      notification_title,
      single_body,
      'meet_chat:' || new.ride_id::text || ':' || recipient.user_id::text,
      new.user_id,
      new.ride_id,
      null,
      null,
      null,
      null,
      destination_url,
      destination_url,
      jsonb_build_object(
        'entity_type', notification_type,
        'entity_id', new.ride_id,
        'route', destination_url
      ),
      coalesce(nullif(preview, ''), single_body),
      grouped_body
    );
  end loop;

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
  destination_url text;
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

  destination_url := public.meet_notification_path(target_ride_id);

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
        'meet_left:' || target_ride_id::text || ':' || ride_host_id::text,
        target_user_id,
        target_ride_id,
        null,
        null,
        null,
        null,
        destination_url,
        destination_url,
        jsonb_build_object('entity_type', 'meet_left', 'entity_id', target_ride_id, 'route', destination_url),
        actor_name,
        '{count} riders left ' || coalesce(ride_name, 'your meet')
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
        'meet_removed:' || target_ride_id::text || ':' || target_user_id::text,
        auth.uid(),
        target_ride_id,
        null,
        null,
        null,
        null,
        destination_url,
        destination_url,
        jsonb_build_object('entity_type', 'meet_removed', 'entity_id', target_ride_id, 'route', destination_url),
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
    destination_url,
    destination_url,
    jsonb_build_object('entity_type', 'meet_joined', 'entity_id', target_ride_id, 'route', destination_url),
    actor_name,
    '{count} riders joined ' || coalesce(ride_name, 'your meet')
  );

  return new;
end;
$$;

create or replace function public.notify_ride_lifecycle_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ride_label text;
  destination_url text;
  attendee record;
begin
  ride_label := coalesce(new.name, 'your meet');
  destination_url := public.meet_notification_path(new.id);

  if old.status = 'active' and new.status = 'canceled' then
    for attendee in
      select ra.user_id
      from public.ride_attendees ra
      where ra.ride_id = new.id
        and ra.user_id <> new.host_id
    loop
      perform public.upsert_grouped_notification(
        attendee.user_id,
        'meet_canceled',
        'Meet canceled',
        ride_label || ' was canceled by the host.',
        'meet_canceled:' || new.id::text || ':' || attendee.user_id::text,
        new.host_id,
        new.id,
        null,
        null,
        null,
        null,
        destination_url,
        destination_url,
        jsonb_build_object('entity_type', 'meet_canceled', 'entity_id', new.id, 'route', destination_url),
        ride_label,
        null
      );
    end loop;

    update public.ride_live_locations
    set sharing_enabled = false,
        updated_at = now()
    where ride_id = new.id
      and sharing_enabled = true;

    return new;
  end if;

  if old.tracking_status = 'active'
    and new.tracking_status = 'ended'
    and new.status = 'active' then
    for attendee in
      select ra.user_id
      from public.ride_attendees ra
      where ra.ride_id = new.id
        and ra.user_id <> new.host_id
    loop
      perform public.upsert_grouped_notification(
        attendee.user_id,
        'meet_ended',
        'Ride ended',
        'Ride tracking has ended for ' || ride_label || '.',
        'meet_ended:' || new.id::text || ':' || attendee.user_id::text,
        new.host_id,
        new.id,
        null,
        null,
        null,
        null,
        destination_url,
        destination_url,
        jsonb_build_object('entity_type', 'meet_ended', 'entity_id', new.id, 'route', destination_url),
        ride_label,
        null
      );
    end loop;
  end if;

  return new;
end;
$$;

create or replace function public.create_direct_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  preview_body text;
  single_body text;
  grouped_body text;
  msg_type text;
  destination_url text;
  member record;
begin
  actor_name := coalesce(public.notification_actor_name(new.sender_id), 'Crimson Member');
  msg_type := coalesce(new.message_type, 'text');
  preview_body := left(trim(coalesce(new.body, '')), 120);
  destination_url := '/messages/' || new.conversation_id::text;

  if preview_body = '' and new.media_url is not null then
    preview_body := 'Sent an attachment';
  end if;

  single_body := case msg_type
    when 'image' then actor_name || ' sent a photo'
    when 'audio' then actor_name || ' sent a voice message'
    when 'system' then actor_name || ' sent an update'
    else actor_name || case
      when preview_body <> '' then ': ' || preview_body
      else ' sent you a message'
    end
  end;

  grouped_body := actor_name || ' sent {count} new messages';

  for member in
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.sender_id
      and not public.users_are_blocked(cm.user_id, new.sender_id)
  loop
    perform public.upsert_grouped_notification(
      member.user_id,
      'direct_message',
      'New message',
      single_body,
      'dm:' || new.conversation_id::text || ':' || member.user_id::text,
      new.sender_id,
      null,
      new.conversation_id,
      null,
      null,
      null,
      destination_url,
      destination_url,
      jsonb_build_object(
        'entity_type', 'direct_message',
        'entity_id', new.conversation_id,
        'route', destination_url
      ),
      preview_body,
      grouped_body
    );
  end loop;

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
    public.meet_notification_path(new.id)
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
