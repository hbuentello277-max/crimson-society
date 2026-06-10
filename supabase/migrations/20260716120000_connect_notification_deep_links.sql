-- Connect request/accepted notifications with deep links to request review and approver profile.

alter table public.notifications
  add column if not exists destination_url text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

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
    'connection_request',
    'connection_request_received',
    'connection_accepted',
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

create or replace function public.notification_actor_username(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(btrim(coalesce(p.username, '')), '')
  from public.profiles p
  where p.id = p_user_id;
$$;

create or replace function public.connection_request_review_url(p_connection_id uuid)
returns text
language sql
immutable
as $$
  select '/connect/requests/' || p_connection_id::text;
$$;

create or replace function public.resolve_connection_request_notifications(
  p_connection_id uuid,
  p_addressee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = p_addressee_id
    and read_at is null
    and type in ('connection_request', 'connection_request_received')
    and coalesce(metadata->>'connection_id', metadata->>'request_id', '') = p_connection_id::text;
end;
$$;

create or replace function public.create_connection_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  actor_username text;
  destination_url text;
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
  actor_username := coalesce(public.notification_actor_username(new.requester_id), '');
  destination_url := public.connection_request_review_url(new.id);

  perform public.upsert_grouped_notification(
    new.addressee_id,
    'connection_request',
    'Connection request',
    actor_name || ' sent you a connection request.',
    'connect_request:' || new.requester_id::text || ':' || new.addressee_id::text,
    new.requester_id,
    null,
    null,
    null,
    null,
    null,
    destination_url,
    destination_url,
    jsonb_build_object(
      'connection_id', new.id,
      'request_id', new.id,
      'entity_type', 'connection_request',
      'entity_id', new.id,
      'actor_user_id', new.requester_id,
      'actor_username', actor_username,
      'route', destination_url
    ),
    actor_name,
    '{count} new connection requests'
  );

  return new;
end;
$$;

create or replace function public.create_connection_accepted_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  actor_username text;
  destination_url text;
begin
  if old.status <> 'pending' or new.status <> 'accepted' then
    return new;
  end if;

  if new.requester_id = new.addressee_id then
    return new;
  end if;

  if public.users_are_blocked(new.requester_id, new.addressee_id) then
    return new;
  end if;

  perform public.resolve_connection_request_notifications(new.id, new.addressee_id);

  actor_name := coalesce(public.notification_actor_name(new.addressee_id), 'Crimson Member');
  actor_username := coalesce(public.notification_actor_username(new.addressee_id), '');
  destination_url := case
    when actor_username is not null then '/profile/' || actor_username
    else '/connect'
  end;

  perform public.upsert_grouped_notification(
    new.requester_id,
    'connection_accepted',
    'Connection accepted',
    actor_name || ' approved your connection request.',
    'connection_accepted:' || new.id::text || ':' || new.requester_id::text,
    new.addressee_id,
    null,
    null,
    null,
    null,
    null,
    destination_url,
    destination_url,
    jsonb_build_object(
      'connection_id', new.id,
      'request_id', new.id,
      'entity_type', 'connection_accepted',
      'entity_id', new.id,
      'actor_user_id', new.addressee_id,
      'actor_username', actor_username,
      'route', destination_url
    ),
    actor_name,
    null
  );

  return new;
end;
$$;

create or replace function public.create_connection_declined_notification_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status = 'declined' then
    perform public.resolve_connection_request_notifications(new.id, new.addressee_id);
  end if;

  return new;
end;
$$;

create or replace function public.create_connection_cancel_notification_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' then
    perform public.resolve_connection_request_notifications(old.id, old.addressee_id);
  end if;

  return old;
end;
$$;

drop trigger if exists create_connection_request_notification_after_insert on public.user_connections;
create trigger create_connection_request_notification_after_insert
after insert on public.user_connections
for each row
execute function public.create_connection_request_notification();

drop trigger if exists create_connection_accepted_notification_after_update on public.user_connections;
create trigger create_connection_accepted_notification_after_update
after update of status on public.user_connections
for each row
execute function public.create_connection_accepted_notification();

drop trigger if exists create_connection_declined_notification_cleanup_after_update on public.user_connections;
create trigger create_connection_declined_notification_cleanup_after_update
after update of status on public.user_connections
for each row
execute function public.create_connection_declined_notification_cleanup();

drop trigger if exists create_connection_cancel_notification_cleanup_after_delete on public.user_connections;
create trigger create_connection_cancel_notification_cleanup_after_delete
after delete on public.user_connections
for each row
execute function public.create_connection_cancel_notification_cleanup();

notify pgrst, 'reload schema';
