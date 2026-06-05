-- Group in-app notifications by conversation/order/meet/social context.
-- Unread grouped notifications are updated in place; once read, a later event
-- starts a fresh group.

alter table public.notifications
  add column if not exists notification_group_key text,
  add column if not exists notification_count integer not null default 1,
  add column if not exists last_actor_id uuid references public.profiles(id) on delete set null,
  add column if not exists last_preview_text text,
  add column if not exists last_event_at timestamptz not null default now();

update public.notifications
set
  notification_count = greatest(coalesce(notification_count, 1), 1),
  last_actor_id = coalesce(last_actor_id, actor_id),
  last_preview_text = coalesce(last_preview_text, body),
  last_event_at = coalesce(last_event_at, created_at, now())
where notification_count is null
   or last_actor_id is null
   or last_preview_text is null
   or last_event_at is null;

create index if not exists notifications_group_key_idx
on public.notifications (user_id, notification_group_key, read_at, created_at desc)
where notification_group_key is not null;

create unique index if not exists notifications_unread_group_key_unique
on public.notifications (user_id, notification_group_key)
where read_at is null and notification_group_key is not null;

create or replace function public.upsert_grouped_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_notification_group_key text default null,
  p_actor_id uuid default null,
  p_ride_id uuid default null,
  p_conversation_id uuid default null,
  p_post_id uuid default null,
  p_comment_id uuid default null,
  p_deletion_request_id uuid default null,
  p_target_url text default null,
  p_destination_url text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_preview_text text default null,
  p_grouped_body_template text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    ride_id,
    actor_id,
    conversation_id,
    post_id,
    comment_id,
    deletion_request_id,
    target_url,
    destination_url,
    metadata,
    notification_group_key,
    notification_count,
    last_actor_id,
    last_preview_text,
    last_event_at,
    created_at
  )
  values (
    p_user_id,
    p_type,
    p_title,
    p_body,
    p_ride_id,
    p_actor_id,
    p_conversation_id,
    p_post_id,
    p_comment_id,
    p_deletion_request_id,
    p_target_url,
    p_destination_url,
    coalesce(p_metadata, '{}'::jsonb)
      || case
        when p_grouped_body_template is null then '{}'::jsonb
        else jsonb_build_object('grouped_body_template', p_grouped_body_template)
      end,
    nullif(btrim(coalesce(p_notification_group_key, '')), ''),
    1,
    p_actor_id,
    coalesce(nullif(btrim(coalesce(p_preview_text, '')), ''), p_body),
    now(),
    now()
  )
  on conflict (user_id, notification_group_key)
  where read_at is null and notification_group_key is not null
  do update set
    title = excluded.title,
    body = coalesce(
      replace(
        excluded.metadata->>'grouped_body_template',
        '{count}',
        (public.notifications.notification_count + 1)::text
      ),
      excluded.body
    ),
    ride_id = coalesce(excluded.ride_id, public.notifications.ride_id),
    actor_id = excluded.actor_id,
    conversation_id = coalesce(excluded.conversation_id, public.notifications.conversation_id),
    post_id = coalesce(excluded.post_id, public.notifications.post_id),
    comment_id = coalesce(excluded.comment_id, public.notifications.comment_id),
    deletion_request_id = coalesce(excluded.deletion_request_id, public.notifications.deletion_request_id),
    target_url = coalesce(excluded.target_url, public.notifications.target_url),
    destination_url = coalesce(excluded.destination_url, public.notifications.destination_url),
    metadata = public.notifications.metadata
      || excluded.metadata
      || jsonb_build_object('notification_count', public.notifications.notification_count + 1),
    notification_count = public.notifications.notification_count + 1,
    last_actor_id = excluded.last_actor_id,
    last_preview_text = excluded.last_preview_text,
    last_event_at = now(),
    created_at = now()
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

revoke all on function public.upsert_grouped_notification(
  uuid, text, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.upsert_grouped_notification(
  uuid, text, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, text, text, jsonb, text, text
) to service_role;

alter table public.push_notification_jobs
  add column if not exists sent_count integer not null default 0;

create or replace function public.enqueue_push_notification_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_notification_jobs (
    notification_id,
    user_id,
    status,
    attempt_count,
    last_error,
    processed_at,
    sent_count,
    created_at
  )
  values (
    new.id,
    new.user_id,
    'pending',
    0,
    null,
    null,
    0,
    now()
  )
  on conflict (notification_id)
  do update set
    user_id = excluded.user_id,
    status = 'pending',
    attempt_count = 0,
    last_error = null,
    processed_at = null,
    sent_count = 0,
    created_at = now();

  return new;
end;
$$;

drop trigger if exists enqueue_push_notification_job_after_insert on public.notifications;
drop trigger if exists enqueue_push_notification_job_after_write on public.notifications;
create trigger enqueue_push_notification_job_after_write
after insert or update of title, body, notification_count, last_actor_id, last_preview_text, last_event_at, created_at
on public.notifications
for each row
execute function public.enqueue_push_notification_job();

drop trigger if exists dispatch_push_job_http_after_insert on public.push_notification_jobs;
drop trigger if exists dispatch_push_job_http_after_pending on public.push_notification_jobs;
create trigger dispatch_push_job_http_after_pending
after insert or update of status
on public.push_notification_jobs
for each row
when (new.status = 'pending')
execute function public.dispatch_push_job_http();

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
  member record;
begin
  actor_name := coalesce(public.notification_actor_name(new.sender_id), 'Crimson Member');
  msg_type := coalesce(new.message_type, 'text');
  preview_body := left(trim(coalesce(new.body, '')), 120);

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
      '/inbox?conversation=' || new.conversation_id::text,
      '/inbox?conversation=' || new.conversation_id::text,
      jsonb_build_object('message_id', new.id),
      preview_body,
      grouped_body
    );
  end loop;

  return new;
end;
$$;

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

  perform public.upsert_grouped_notification(
    new.following_id,
    'profile_followed',
    'New follower',
    actor_name || ' started following you.',
    'profile_followed:' || new.following_id::text,
    new.follower_id,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '{}'::jsonb,
    actor_name,
    '{count} new followers'
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
        '/rides?meet=' || target_ride_id::text,
        '/rides?meet=' || target_ride_id::text,
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
        '/rides?meet=' || target_ride_id::text,
        '/rides?meet=' || target_ride_id::text,
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
    '/rides?meet=' || target_ride_id::text,
    '/rides?meet=' || target_ride_id::text,
    '{}'::jsonb,
    actor_name,
    '{count} riders joined ' || coalesce(ride_name, 'your meet')
  );

  return new;
end;
$$;

notify pgrst, 'reload schema';
