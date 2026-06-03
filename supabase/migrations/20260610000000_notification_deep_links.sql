-- Notification deep links: post engagement types, destination FK columns, triggers.

alter table public.notifications
  add column if not exists post_id uuid references public."Posts"(id) on delete cascade,
  add column if not exists comment_id uuid references public.post_comments(id) on delete cascade,
  add column if not exists deletion_request_id uuid references public.account_deletion_requests(id) on delete cascade,
  add column if not exists target_url text;

create index if not exists notifications_post_id_idx
  on public.notifications (post_id, created_at desc)
  where post_id is not null;

create index if not exists notifications_deletion_request_id_idx
  on public.notifications (deletion_request_id, created_at desc)
  where deletion_request_id is not null;

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
    'meet_ended',
    'direct_message',
    'post_liked',
    'post_commented',
    'account_deletion_requested',
    'account_deletion_canceled',
    'account_deletion_approved'
  )
);

create or replace function public.create_post_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_owner_id uuid;
  actor_name text;
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

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    post_id,
    actor_id,
    target_url
  )
  values (
    post_owner_id,
    'post_liked',
    'Post liked',
    actor_name || ' liked your post.',
    new.post_id,
    new.user_id,
    '/dashboard?post=' || new.post_id::text
  );

  return new;
end;
$$;

drop trigger if exists create_post_like_notification_after_insert on public.post_likes;
create trigger create_post_like_notification_after_insert
after insert on public.post_likes
for each row
execute function public.create_post_like_notification();

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

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    post_id,
    comment_id,
    actor_id,
    target_url
  )
  values (
    post_owner_id,
    'post_commented',
    'New comment',
    actor_name || ' commented on your post: ' || coalesce(nullif(preview, ''), 'New comment'),
    new.post_id,
    new.id,
    new.user_id,
    '/dashboard?post=' || new.post_id::text || '&comment=' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists create_post_comment_notification_after_insert on public.post_comments;
create trigger create_post_comment_notification_after_insert
after insert on public.post_comments
for each row
execute function public.create_post_comment_notification();

create or replace function public.notify_admins_account_deletion_event(
  p_actor_user_id uuid,
  p_username text,
  p_kind text,
  p_deletion_request_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_row record;
  handle text;
  title_text text;
  body_text text;
  destination_url text;
begin
  if p_kind not in (
    'account_deletion_requested',
    'account_deletion_canceled',
    'account_deletion_approved'
  ) then
    raise exception 'Invalid deletion notification kind.';
  end if;

  handle := coalesce(nullif(trim(both '@' from coalesce(p_username, '')), ''), 'member');
  if left(handle, 1) <> '@' then
    handle := '@' || handle;
  end if;

  case p_kind
    when 'account_deletion_requested' then
      title_text := 'Account deletion requested';
      body_text := format('User %s submitted an account deletion request.', handle);
    when 'account_deletion_canceled' then
      title_text := 'Account deletion canceled';
      body_text := format('User %s cancelled their account deletion request.', handle);
    when 'account_deletion_approved' then
      title_text := 'Account deletion approved';
      body_text := format('Account deletion was approved for %s.', handle);
  end case;

  destination_url := '/admin?section=deletion';
  if p_deletion_request_id is not null then
    destination_url := destination_url || '&request=' || p_deletion_request_id::text;
  end if;

  for admin_row in
    select id
    from public.profiles
    where status = 'active'
      and (is_admin = true or role = 'admin')
      and id <> p_actor_user_id
  loop
    if not exists (
      select 1
      from public.notifications n
      where n.user_id = admin_row.id
        and n.type = p_kind
        and n.actor_id = p_actor_user_id
        and n.created_at >= now() - interval '5 minutes'
    ) then
      insert into public.notifications (
        user_id,
        type,
        title,
        body,
        actor_id,
        deletion_request_id,
        target_url
      )
      values (
        admin_row.id,
        p_kind,
        title_text,
        body_text,
        p_actor_user_id,
        p_deletion_request_id,
        destination_url
      );
    end if;
  end loop;
end;
$$;

create or replace function public.request_account_deletion(p_confirmation text)
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_existing public.account_deletion_requests;
  v_request public.account_deletion_requests;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Not authenticated.';
  end if;

  if trim(coalesce(p_confirmation, '')) <> 'DELETE' then
    raise exception 'Type DELETE in the confirmation field to submit this request.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  if v_profile.is_admin = true or v_profile.role = 'admin' then
    raise exception 'Admin accounts cannot be deleted through this flow.';
  end if;

  if v_profile.status = 'deletion_pending' then
    raise exception 'Account deletion is already pending.';
  end if;

  select *
  into v_existing
  from public.account_deletion_requests
  where user_id = v_user_id
    and status in ('pending', 'reviewing')
  order by requested_at desc
  limit 1;

  if found then
    raise exception 'An open deletion request already exists.';
  end if;

  insert into public.account_deletion_requests (
    user_id,
    status,
    details,
    signed_out_at,
    previous_status
  )
  values (
    v_user_id,
    'pending',
    'Requested via in-app account deletion.',
    v_now,
    coalesce(v_profile.status, 'active')
  )
  returning * into v_request;

  perform set_config('app.account_deletion_status_override', 'request', true);

  update public.profiles
  set status = 'deletion_pending',
      hide_from_suggestions = true,
      hide_location_from_suggestions = true
  where id = v_user_id;

  perform public.notify_admins_account_deletion_event(
    v_user_id,
    v_profile.username,
    'account_deletion_requested',
    v_request.id
  );

  return v_request;
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
  destination_url := '/rides?meet=' || new.ride_id::text || '&section=chat';

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

notify pgrst, 'reload schema';
