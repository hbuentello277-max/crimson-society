-- Rider SOS Phase 4D: SOS coordination chat using existing conversations/messages.

alter table public.conversations
  add column if not exists sos_event_id uuid references public.rider_sos_events(id) on delete set null,
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists conversation_status text not null default 'active',
  add column if not exists sos_type text,
  add column if not exists sos_owner_name text,
  add column if not exists sos_active_responder_count integer not null default 0;

alter table public.conversations drop constraint if exists conversations_type_check;
alter table public.conversations add constraint conversations_type_check
check (conversation_type in ('direct', 'group', 'sos'));

alter table public.conversations drop constraint if exists conversations_status_check;
alter table public.conversations add constraint conversations_status_check
check (conversation_status in ('active', 'archived'));

create unique index if not exists conversations_sos_event_unique
  on public.conversations (sos_event_id)
  where conversation_type = 'sos' and sos_event_id is not null;

create index if not exists conversations_sos_status_idx
  on public.conversations (conversation_type, conversation_status, updated_at desc)
  where conversation_type = 'sos';

create or replace function public.refresh_rider_sos_conversation_context(p_sos_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.rider_sos_events%rowtype;
  v_owner_name text;
  v_count integer := 0;
begin
  select *
  into v_event
  from public.rider_sos_events
  where id = p_sos_event_id;

  if not found then
    return;
  end if;

  v_owner_name := coalesce(public.notification_actor_name(v_event.user_id), 'Crimson Rider');

  select count(*)::integer
  into v_count
  from public.rider_sos_responses r
  where r.sos_event_id = p_sos_event_id
    and r.status in ('responding', 'arrived');

  update public.conversations
  set sos_type = v_event.sos_type,
      sos_owner_name = v_owner_name,
      sos_active_responder_count = v_count,
      updated_at = now()
  where sos_event_id = p_sos_event_id
    and conversation_type = 'sos';
end;
$$;

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
    'event_announcement',
    'sos_activated',
    'sos_responded',
    'sos_arrived',
    'sos_chat_message'
  )
);

create or replace function public.is_sos_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.conversation_type = 'sos'
      and (
        exists (
          select 1
          from public.conversation_members cm
          where cm.conversation_id = c.id
            and cm.user_id = p_user_id
        )
        or public.is_profile_admin(p_user_id)
        or public.is_platform_owner(p_user_id)
      )
  );
$$;

drop policy if exists "Admins read SOS conversations" on public.conversations;
create policy "Admins read SOS conversations"
on public.conversations
for select
to authenticated
using (
  conversation_type = 'sos'
  and (
    public.is_profile_admin(auth.uid())
    or public.is_platform_owner(auth.uid())
  )
);

drop policy if exists "Admins read SOS conversation members" on public.conversation_members;
create policy "Admins read SOS conversation members"
on public.conversation_members
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_members.conversation_id
      and c.conversation_type = 'sos'
      and (
        public.is_profile_admin(auth.uid())
        or public.is_platform_owner(auth.uid())
      )
  )
);

drop policy if exists "Active users can join conversations they create" on public.conversation_members;
drop policy if exists "Users can join conversations they create" on public.conversation_members;
create policy "Active users can join conversations they create"
on public.conversation_members
for insert
to authenticated
with check (
  public.is_active_user(auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_members.conversation_id
      and c.created_by = auth.uid()
      and public.is_active_user(c.created_by)
      and not public.users_are_blocked(auth.uid(), conversation_members.user_id)
      and not (
        c.conversation_type = 'sos'
        and c.conversation_status <> 'active'
    )
  )
);

drop policy if exists "Admins read SOS messages" on public.messages;
create policy "Admins read SOS messages"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.conversation_type = 'sos'
      and (
        public.is_profile_admin(auth.uid())
        or public.is_platform_owner(auth.uid())
      )
  )
);

drop policy if exists "Active SOS participants send messages" on public.messages;
create policy "Active SOS participants send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.conversation_type = 'sos'
      and c.conversation_status = 'active'
      and public.is_sos_conversation_participant(c.id, auth.uid())
  )
);

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.is_active_user(auth.uid())
  and public.is_conversation_member(conversation_id, auth.uid())
  and not exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and c.conversation_type = 'sos'
      and c.conversation_status <> 'active'
  )
  and not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id <> auth.uid()
      and public.users_are_blocked(auth.uid(), cm.user_id)
  )
);

create or replace function public.ensure_rider_sos_conversation(p_sos_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.rider_sos_events%rowtype;
  v_conversation_id uuid;
begin
  select *
  into v_event
  from public.rider_sos_events
  where id = p_sos_event_id;

  if not found then
    raise exception 'SOS event not found';
  end if;

  insert into public.conversations (
    conversation_type,
    title,
    created_by,
    sos_event_id,
    owner_user_id,
    conversation_status,
    sos_type,
    sos_owner_name,
    sos_active_responder_count
  )
  values (
    'sos',
    '🚨 SOS Assistance Chat',
    v_event.user_id,
    v_event.id,
    v_event.user_id,
    case when v_event.status = 'active' then 'active' else 'archived' end,
    v_event.sos_type,
    coalesce(public.notification_actor_name(v_event.user_id), 'Crimson Rider'),
    0
  )
  on conflict (sos_event_id)
  where conversation_type = 'sos' and sos_event_id is not null
  do update set
    title = excluded.title,
    owner_user_id = excluded.owner_user_id,
    conversation_status = excluded.conversation_status,
    sos_type = excluded.sos_type,
    sos_owner_name = excluded.sos_owner_name
  returning id into v_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (v_conversation_id, v_event.user_id, 'owner')
  on conflict (conversation_id, user_id)
  do update set role = excluded.role;

  return v_conversation_id;
end;
$$;

create or replace function public.get_rider_sos_conversation_id(p_sos_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.rider_sos_events%rowtype;
  v_conversation_id uuid;
begin
  select *
  into v_event
  from public.rider_sos_events
  where id = p_sos_event_id;

  if not found then
    return null;
  end if;

  if not (
    v_event.user_id = auth.uid()
    or public.is_profile_admin(auth.uid())
    or public.is_platform_owner(auth.uid())
    or exists (
      select 1
      from public.rider_sos_responses r
      where r.sos_event_id = p_sos_event_id
        and r.responder_user_id = auth.uid()
        and r.status in ('responding', 'arrived')
    )
  ) then
    return null;
  end if;

  select c.id
  into v_conversation_id
  from public.conversations c
  where c.sos_event_id = p_sos_event_id
    and c.conversation_type = 'sos'
  limit 1;

  if v_conversation_id is null then
    v_conversation_id := public.ensure_rider_sos_conversation(p_sos_event_id);
  end if;

  if public.is_profile_admin(auth.uid()) or public.is_platform_owner(auth.uid()) then
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, auth.uid(), 'admin')
    on conflict (conversation_id, user_id)
    do update set role = excluded.role;
  end if;

  return v_conversation_id;
end;
$$;

create or replace function public.get_active_rider_sos_chat_for_current_user()
returns table (
  conversation_id uuid,
  sos_event_id uuid,
  title text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as conversation_id,
    c.sos_event_id,
    c.title
  from public.conversations c
  inner join public.conversation_members cm
    on cm.conversation_id = c.id
   and cm.user_id = auth.uid()
  where c.conversation_type = 'sos'
    and c.conversation_status = 'active'
    and public.is_active_user(auth.uid())
  order by c.updated_at desc
  limit 1;
$$;

create or replace function public.sync_rider_sos_response_chat_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  v_conversation_id := public.ensure_rider_sos_conversation(new.sos_event_id);

  if new.status in ('responding', 'arrived') then
    insert into public.conversation_members (conversation_id, user_id, role)
    values (v_conversation_id, new.responder_user_id, 'responder')
    on conflict (conversation_id, user_id)
    do update set role = excluded.role;
  elsif new.status = 'cancelled' then
    delete from public.conversation_members
    where conversation_id = v_conversation_id
      and user_id = new.responder_user_id
      and role = 'responder';
  end if;

  perform public.refresh_rider_sos_conversation_context(new.sos_event_id);

  return new;
end;
$$;

create or replace function public.create_rider_sos_conversation_on_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_rider_sos_conversation(new.id);
  return new;
end;
$$;

create or replace function public.archive_rider_sos_conversation_on_event_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'active' and old.status = 'active' then
    update public.conversations
    set conversation_status = 'archived',
        updated_at = now()
    where sos_event_id = new.id
      and conversation_type = 'sos';
  end if;

  return new;
end;
$$;

create or replace function public.create_sos_chat_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversation public.conversations%rowtype;
  v_event public.rider_sos_events%rowtype;
  v_actor_name text;
  v_preview text;
  v_body text;
  v_destination_url text;
  v_member record;
begin
  select *
  into v_conversation
  from public.conversations
  where id = new.conversation_id
    and conversation_type = 'sos';

  if not found then
    return new;
  end if;

  select *
  into v_event
  from public.rider_sos_events
  where id = v_conversation.sos_event_id;

  if not found then
    return new;
  end if;

  v_actor_name := coalesce(public.notification_actor_name(new.sender_id), 'Crimson Rider');
  v_preview := left(trim(coalesce(new.body, '')), 120);
  if v_preview = '' and new.media_url is not null then
    v_preview := 'Sent an attachment';
  end if;
  v_body := v_actor_name || ':' || case when v_preview <> '' then ' ' || v_preview else ' New SOS chat message' end;
  v_destination_url := '/inbox?conversation=' || new.conversation_id::text;

  for v_member in
    select cm.user_id
    from public.conversation_members cm
    where cm.conversation_id = new.conversation_id
      and cm.user_id <> new.sender_id
      and not public.users_are_blocked(cm.user_id, new.sender_id)
  loop
    perform public.upsert_grouped_notification(
      v_member.user_id,
      'sos_chat_message',
      '🚨 SOS Chat',
      v_body,
      'sos_chat:' || new.conversation_id::text || ':' || v_member.user_id::text,
      new.sender_id,
      null,
      new.conversation_id,
      null,
      null,
      null,
      v_destination_url,
      v_destination_url,
      jsonb_build_object(
        'entity_type', 'sos_chat_message',
        'entity_id', new.conversation_id,
        'sos_alert_id', v_event.id,
        'route', v_destination_url
      ),
      v_preview,
      'SOS chat has {count} new messages'
    );
  end loop;

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
  if exists (
    select 1
    from public.conversations c
    where c.id = new.conversation_id
      and c.conversation_type = 'sos'
  ) then
    return new;
  end if;

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

drop trigger if exists create_rider_sos_conversation_on_event on public.rider_sos_events;
create trigger create_rider_sos_conversation_on_event
after insert on public.rider_sos_events
for each row execute function public.create_rider_sos_conversation_on_event();

drop trigger if exists archive_rider_sos_conversation_on_event_close on public.rider_sos_events;
create trigger archive_rider_sos_conversation_on_event_close
after update of status on public.rider_sos_events
for each row execute function public.archive_rider_sos_conversation_on_event_close();

drop trigger if exists sync_rider_sos_response_chat_membership on public.rider_sos_responses;
create trigger sync_rider_sos_response_chat_membership
after insert or update of status on public.rider_sos_responses
for each row execute function public.sync_rider_sos_response_chat_membership();

drop trigger if exists create_sos_chat_message_notifications_after_insert on public.messages;
create trigger create_sos_chat_message_notifications_after_insert
after insert on public.messages
for each row execute function public.create_sos_chat_message_notifications();

revoke all on function public.is_sos_conversation_participant(uuid, uuid) from public;
revoke all on function public.refresh_rider_sos_conversation_context(uuid) from public;
revoke all on function public.ensure_rider_sos_conversation(uuid) from public;
revoke all on function public.get_rider_sos_conversation_id(uuid) from public;
revoke all on function public.get_active_rider_sos_chat_for_current_user() from public;
revoke all on function public.sync_rider_sos_response_chat_membership() from public;
revoke all on function public.create_rider_sos_conversation_on_event() from public;
revoke all on function public.archive_rider_sos_conversation_on_event_close() from public;
revoke all on function public.create_sos_chat_message_notifications() from public;
revoke all on function public.create_direct_message_notification() from public;

grant execute on function public.is_sos_conversation_participant(uuid, uuid) to authenticated, service_role;
grant execute on function public.refresh_rider_sos_conversation_context(uuid) to service_role;
grant execute on function public.ensure_rider_sos_conversation(uuid) to authenticated, service_role;
grant execute on function public.get_rider_sos_conversation_id(uuid) to authenticated, service_role;
grant execute on function public.get_active_rider_sos_chat_for_current_user() to authenticated, service_role;

notify pgrst, 'reload schema';

