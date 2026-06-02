-- DM message media: typed messages, storage bucket, notification copy, constraints.

alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists media_path text,
  add column if not exists media_mime_type text,
  add column if not exists media_size_bytes integer,
  add column if not exists media_duration_seconds integer,
  add column if not exists media_width integer,
  add column if not exists media_height integer,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- Legacy rows may have been created before message_type existed.
update public.messages
set message_type = case
  when coalesce(message_type, '') <> '' then message_type
  when media_url is not null and media_url <> '' then 'image'
  else 'text'
end
where message_type is null or message_type = '';

alter table public.messages
  alter column body drop not null;

alter table public.messages
  alter column body set default '';

update public.messages
set body = coalesce(body, '');

update public.messages
set body = '[legacy message]'
where char_length(trim(coalesce(body, ''))) = 0
  and coalesce(message_type, 'text') = 'text'
  and (media_url is null and media_path is null);

alter table public.messages
  drop constraint if exists messages_message_type_check;

alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text', 'image', 'audio', 'system'));

alter table public.messages
  drop constraint if exists messages_payload_check;

alter table public.messages
  add constraint messages_payload_check
  check (
    (
      message_type = 'text'
      and char_length(trim(coalesce(body, ''))) > 0
    )
    or (
      message_type = 'image'
      and (media_url is not null or media_path is not null)
    )
    or (
      message_type = 'audio'
      and (media_url is not null or media_path is not null)
    )
    or message_type = 'system'
  );

create index if not exists messages_conversation_type_created_idx
  on public.messages (conversation_id, message_type, created_at desc);

-- Storage: message-media/{conversation_id}/{file}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'audio/mpeg',
    'audio/mp4',
    'audio/webm',
    'audio/m4a',
    'audio/x-m4a',
    'audio/aac'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.message_media_conversation_id(object_name text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select nullif((storage.foldername(object_name))[1], '')::uuid;
$$;

revoke all on function public.message_media_conversation_id(text) from public;
grant execute on function public.message_media_conversation_id(text) to authenticated, anon;

drop policy if exists "Message media public read" on storage.objects;
drop policy if exists "Conversation members read message media" on storage.objects;
drop policy if exists "Conversation members upload message media" on storage.objects;
drop policy if exists "Conversation members update message media" on storage.objects;
drop policy if exists "Conversation members delete message media" on storage.objects;

create policy "Message media public read"
on storage.objects
for select
to public
using (bucket_id = 'message-media');

create policy "Conversation members upload message media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and public.is_conversation_member(public.message_media_conversation_id(name), auth.uid())
);

create policy "Conversation members update message media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'message-media'
  and public.is_conversation_member(public.message_media_conversation_id(name), auth.uid())
)
with check (
  bucket_id = 'message-media'
  and public.is_conversation_member(public.message_media_conversation_id(name), auth.uid())
);

create policy "Conversation members delete message media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-media'
  and public.is_conversation_member(public.message_media_conversation_id(name), auth.uid())
);

-- DM notifications: no private body in push/in-app preview for media.
create or replace function public.create_direct_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  notification_body text;
  msg_type text;
begin
  actor_name := coalesce(public.notification_actor_name(new.sender_id), 'Crimson Member');
  msg_type := coalesce(new.message_type, 'text');

  notification_body := case msg_type
    when 'image' then actor_name || ' sent a photo'
    when 'audio' then actor_name || ' sent a voice message'
    when 'system' then actor_name || ' sent an update'
    else 'New message from ' || actor_name
  end;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    conversation_id,
    actor_id
  )
  select
    cm.user_id,
    'direct_message',
    'New message',
    notification_body,
    new.conversation_id,
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and not public.users_are_blocked(cm.user_id, new.sender_id);

  return new;
end;
$$;
