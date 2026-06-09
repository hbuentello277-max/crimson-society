-- Notification gap types: connect requests, meet updates/reminders, admin reports,
-- and grouped post engagement notifications.

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'meet_joined',
    'meet_left',
    'meet_chat_message',
    'meet_chat_photo',
    'profile_followed',
    'meet_removed',
    'meet_canceled',
    'meet_updated',
    'meet_ended',
    'meet_reminder',
    'direct_message',
    'new_conversation',
    'connection_request_received',
    'post_liked',
    'post_commented',
    'favorite_rider_meet',
    'favorite_rider_post',
    'favorite_rider_ride_started',
    'host_meet_created',
    'shop_order_paid',
    'shop_order_confirmed',
    'shop_order_ready',
    'shop_order_ready_for_pickup',
    'shop_order_shipped',
    'admin_report_submitted',
    'admin_order_placed',
    'account_deletion_requested',
    'account_deletion_canceled',
    'account_deletion_approved',
    'blackcard_announcement',
    'crimson_credits_reward',
    'event_announcement'
  )
);

create table if not exists public.meet_reminder_sent (
  id uuid primary key default gen_random_uuid(),
  meet_id uuid not null references public.rides(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_window text not null check (reminder_window in ('24h', '1h')),
  sent_at timestamptz not null default now(),
  unique (meet_id, user_id, reminder_window)
);

create index if not exists meet_reminder_sent_meet_id_idx
on public.meet_reminder_sent (meet_id, reminder_window);

alter table public.meet_reminder_sent enable row level security;

revoke all on table public.meet_reminder_sent from anon, authenticated;
grant select, insert, delete on table public.meet_reminder_sent to service_role;

create or replace function public.create_connection_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  if new.requester_id = new.addressee_id then
    return new;
  end if;

  if public.users_are_blocked(new.requester_id, new.addressee_id) then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(new.requester_id), 'Crimson Member');

  perform public.upsert_grouped_notification(
    new.addressee_id,
    'connection_request_received',
    'Connect request',
    actor_name || ' sent you a connect request.',
    'connect_request:' || new.requester_id::text || ':' || new.addressee_id::text,
    new.requester_id,
    null,
    null,
    null,
    null,
    null,
    '/connect',
    '/connect',
    jsonb_build_object('connection_id', new.id),
    actor_name,
    '{count} new connect requests'
  );

  return new;
end;
$$;

drop trigger if exists create_connection_request_notification_after_insert on public.user_connections;
create trigger create_connection_request_notification_after_insert
after insert on public.user_connections
for each row
execute function public.create_connection_request_notification();

create or replace function public.notify_meet_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  attendee record;
  destination_url text;
begin
  if new.status = 'canceled' or old.status = 'canceled' then
    return new;
  end if;

  if new.date is not distinct from old.date
    and new.time is not distinct from old.time
    and new.name is not distinct from old.name
    and new.meet_point is not distinct from old.meet_point
    and new.destination is not distinct from old.destination
    and coalesce(new.description, '') is not distinct from coalesce(old.description, '')
    and coalesce(new.meet_duration_minutes, 0) is not distinct from coalesce(old.meet_duration_minutes, 0)
  then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(auth.uid()), 'Meet host');
  destination_url := '/meets?meet=' || new.id::text;

  for attendee in
    select ra.user_id
    from public.ride_attendees ra
    where ra.ride_id = new.id
      and ra.user_id is distinct from auth.uid()
      and not public.users_are_blocked(ra.user_id, auth.uid())
  loop
    perform public.upsert_grouped_notification(
      attendee.user_id,
      'meet_updated',
      'Meet updated',
      actor_name || ' updated ' || coalesce(new.name, 'your meet') || '.',
      'meet_updated:' || new.id::text || ':' || attendee.user_id::text,
      auth.uid(),
      new.id,
      null,
      null,
      null,
      null,
      destination_url,
      destination_url,
      '{}'::jsonb,
      'Meet details changed',
      '{count} updates to ' || coalesce(new.name, 'your meet')
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists notify_meet_updated_after_update on public.rides;
create trigger notify_meet_updated_after_update
after update of date, time, name, meet_point, destination, description, meet_duration_minutes
on public.rides
for each row
execute function public.notify_meet_updated();

create or replace function public.create_admin_report_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_row record;
  destination_url text := '/admin?section=moderation';
begin
  for admin_row in
    select p.id
    from public.profiles p
    where p.status = 'active'
      and (
        p.is_admin = true
        or p.role = 'admin'
        or p.is_platform_owner = true
      )
  loop
    perform public.upsert_grouped_notification(
      admin_row.id,
      'admin_report_submitted',
      'New report submitted',
      'A member submitted a moderation report for review.',
      'admin_report_queue:' || admin_row.id::text,
      new.reporter_id,
      null,
      null,
      null,
      null,
      null,
      destination_url,
      destination_url,
      jsonb_build_object('report_id', new.id),
      'Moderation report',
      '{count} new reports need review'
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists create_admin_report_notification_after_insert on public.user_reports;
create trigger create_admin_report_notification_after_insert
after insert on public.user_reports
for each row
execute function public.create_admin_report_notification();

create or replace function public.create_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner_id uuid;
  actor_name text;
  destination_url text;
begin
  select p.user_id
  into post_owner_id
  from public."Posts" p
  where p.id = new.post_id;

  if post_owner_id is null or post_owner_id = new.user_id then
    return new;
  end if;

  if public.users_are_blocked(new.user_id, post_owner_id) then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(new.user_id), 'Crimson Member');
  destination_url := '/dashboard?post=' || new.post_id::text;

  perform public.upsert_grouped_notification(
    post_owner_id,
    'post_liked',
    'Post liked',
    actor_name || ' liked your post.',
    'post_liked:' || new.post_id::text || ':' || post_owner_id::text,
    new.user_id,
    null,
    null,
    new.post_id,
    null,
    null,
    destination_url,
    destination_url,
    '{}'::jsonb,
    actor_name,
    '{count} new likes on your post'
  );

  return new;
end;
$$;

create or replace function public.create_post_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner_id uuid;
  actor_name text;
  preview text;
  destination_url text;
begin
  select p.user_id
  into post_owner_id
  from public."Posts" p
  where p.id = new.post_id;

  if post_owner_id is null or post_owner_id = new.user_id then
    return new;
  end if;

  if public.users_are_blocked(new.user_id, post_owner_id) then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(new.user_id), 'Crimson Member');
  preview := left(trim(new.body), 120);
  destination_url := '/dashboard?post=' || new.post_id::text || '&comment=' || new.id::text;

  perform public.upsert_grouped_notification(
    post_owner_id,
    'post_commented',
    'New comment',
    actor_name || ' commented on your post: ' || coalesce(nullif(preview, ''), 'New comment'),
    'post_commented:' || new.post_id::text || ':' || post_owner_id::text,
    new.user_id,
    null,
    null,
    new.post_id,
    new.id,
    null,
    destination_url,
    destination_url,
    '{}'::jsonb,
    preview,
    '{count} new comments on your post'
  );

  return new;
end;
$$;

notify pgrst, 'reload schema';
