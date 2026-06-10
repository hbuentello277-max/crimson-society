-- Follow, like, comment, and order notification deep links with canonical types.

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
    'order_preparing',
    'order_shipped',
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

create or replace function public.create_profile_follow_notification()
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
  if new.follower_id = new.following_id then
    return new;
  end if;

  if public.users_are_blocked(new.follower_id, new.following_id) then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(new.follower_id), 'Crimson Member');
  actor_username := coalesce(public.notification_actor_username(new.follower_id), '');
  destination_url := case
    when actor_username is not null then '/profile/' || actor_username
    else '/connect'
  end;

  perform public.upsert_grouped_notification(
    new.following_id,
    'follow',
    'New follower',
    actor_name || ' followed you.',
    'follow:' || new.follower_id::text || ':' || new.following_id::text,
    new.follower_id,
    null,
    null,
    null,
    null,
    null,
    destination_url,
    destination_url,
    jsonb_build_object(
      'entity_type', 'follow',
      'entity_id', new.follower_id,
      'actor_user_id', new.follower_id,
      'actor_username', actor_username,
      'route', destination_url
    ),
    actor_name,
    '{count} new followers'
  );

  return new;
end;
$$;

create or replace function public.create_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner_id uuid;
  actor_name text;
  actor_username text;
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
  actor_username := coalesce(public.notification_actor_username(new.user_id), '');
  destination_url := '/dashboard?post=' || new.post_id::text;

  perform public.upsert_grouped_notification(
    post_owner_id,
    'post_like',
    'Post liked',
    actor_name || ' liked your post.',
    'post_like:' || new.post_id::text || ':' || post_owner_id::text || ':' || new.user_id::text,
    new.user_id,
    null,
    null,
    new.post_id,
    null,
    null,
    destination_url,
    destination_url,
    jsonb_build_object(
      'entity_type', 'post_like',
      'entity_id', new.post_id,
      'post_id', new.post_id,
      'actor_user_id', new.user_id,
      'actor_username', actor_username,
      'route', destination_url
    ),
    actor_name,
    null
  );

  return new;
end;
$$;

create or replace function public.remove_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner_id uuid;
begin
  select p.user_id
  into post_owner_id
  from public."Posts" p
  where p.id = old.post_id;

  if post_owner_id is null then
    return old;
  end if;

  delete from public.notifications
  where user_id = post_owner_id
    and notification_group_key = 'post_like:' || old.post_id::text || ':' || post_owner_id::text || ':' || old.user_id::text
    and type in ('post_like', 'post_liked');

  return old;
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
  actor_username text;
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
  actor_username := coalesce(public.notification_actor_username(new.user_id), '');
  preview := left(trim(new.body), 120);
  destination_url := '/dashboard?post=' || new.post_id::text || '&comment=' || new.id::text;

  perform public.upsert_grouped_notification(
    post_owner_id,
    'post_comment',
    'New comment',
    actor_name || ' commented on your post.',
    'post_comment:' || new.post_id::text || ':' || post_owner_id::text,
    new.user_id,
    null,
    null,
    new.post_id,
    new.id,
    null,
    destination_url,
    destination_url,
    jsonb_build_object(
      'entity_type', 'post_comment',
      'entity_id', new.id,
      'post_id', new.post_id,
      'comment_id', new.id,
      'actor_user_id', new.user_id,
      'actor_username', actor_username,
      'route', destination_url
    ),
    preview,
    '{count} new comments on your post'
  );

  return new;
end;
$$;

drop trigger if exists remove_post_like_notification_after_delete on public.post_likes;
create trigger remove_post_like_notification_after_delete
after delete on public.post_likes
for each row
execute function public.remove_post_like_notification();

notify pgrst, 'reload schema';
