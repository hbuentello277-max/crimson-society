-- Device push: token storage, direct-message in-app notifications, dispatch queue.

alter table public.profiles
add column if not exists push_notifications_enabled boolean not null default true;

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'web' check (platform in ('web', 'ios', 'android')),
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists user_push_tokens_user_enabled_idx
on public.user_push_tokens (user_id)
where enabled = true;

alter table public.user_push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.user_push_tokens;
create policy "Users manage own push tokens"
on public.user_push_tokens
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter table public.notifications
add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

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
    'direct_message'
  )
);

create table if not exists public.push_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists push_notification_jobs_pending_idx
on public.push_notification_jobs (created_at)
where status = 'pending';

alter table public.push_notification_jobs enable row level security;

drop policy if exists "Service role manages push jobs" on public.push_notification_jobs;
create policy "Service role manages push jobs"
on public.push_notification_jobs
for all
to service_role
using (true)
with check (true);

create or replace function public.enqueue_push_notification_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_notification_jobs (notification_id, user_id)
  values (new.id, new.user_id);

  return new;
end;
$$;

drop trigger if exists enqueue_push_notification_job_after_insert on public.notifications;
create trigger enqueue_push_notification_job_after_insert
after insert on public.notifications
for each row
execute function public.enqueue_push_notification_job();

create or replace function public.create_direct_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  conversation_title text;
  preview_body text;
begin
  actor_name := coalesce(public.notification_actor_name(new.sender_id), 'Crimson Member');
  preview_body := left(trim(coalesce(new.body, '')), 120);

  if preview_body = '' and new.media_url is not null then
    preview_body := 'Sent an attachment';
  end if;

  select coalesce(nullif(trim(c.title), ''), 'your conversation')
  into conversation_title
  from public.conversations c
  where c.id = new.conversation_id;

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
    actor_name || ' messaged you' || case
      when preview_body <> '' then ': ' || preview_body
      else '.'
    end,
    new.conversation_id,
    new.sender_id
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
    and not public.users_are_blocked(cm.user_id, new.sender_id);

  return new;
end;
$$;

drop trigger if exists create_direct_message_notification_after_insert on public.messages;
create trigger create_direct_message_notification_after_insert
after insert on public.messages
for each row
execute function public.create_direct_message_notification();

grant select, insert, update, delete on public.user_push_tokens to authenticated;
grant all on public.user_push_tokens to service_role;
grant all on public.push_notification_jobs to service_role;
