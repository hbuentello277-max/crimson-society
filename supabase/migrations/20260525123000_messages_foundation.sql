create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'direct',
  title text,
  avatar_url text,
  direct_key text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations add column if not exists conversation_type text not null default 'direct';
alter table public.conversations add column if not exists title text;
alter table public.conversations add column if not exists avatar_url text;
alter table public.conversations add column if not exists direct_key text unique;
alter table public.conversations add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.conversations add column if not exists created_at timestamptz not null default now();
alter table public.conversations add column if not exists updated_at timestamptz not null default now();

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

alter table public.conversation_members add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.conversation_members add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.conversation_members add column if not exists role text not null default 'member';
alter table public.conversation_members add column if not exists last_read_at timestamptz;
alter table public.conversation_members add column if not exists joined_at timestamptz not null default now();

create unique index if not exists conversation_members_conversation_user_key
  on public.conversation_members (conversation_id, user_id);

create index if not exists conversation_members_user_idx
  on public.conversation_members (user_id, joined_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  media_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid references auth.users(id) on delete cascade;
alter table public.messages add column if not exists body text;
alter table public.messages add column if not exists media_url text;
alter table public.messages add column if not exists created_at timestamptz not null default now();
alter table public.messages add column if not exists updated_at timestamptz not null default now();

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);

create index if not exists messages_sender_idx
  on public.messages (sender_id, created_at desc);

create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and user_id = target_user_id
  );
$$;

drop trigger if exists touch_conversations_updated_at on public.conversations;
create trigger touch_conversations_updated_at
before update on public.conversations
for each row execute function public.touch_updated_at();

drop trigger if exists touch_messages_updated_at on public.messages;
create trigger touch_messages_updated_at
before update on public.messages
for each row execute function public.touch_updated_at();

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'Users can read their conversations') then
    create policy "Users can read their conversations"
    on public.conversations
    for select
    using (public.is_conversation_member(id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'Users can create conversations') then
    create policy "Users can create conversations"
    on public.conversations
    for insert
    with check (auth.uid() = created_by);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversations' and policyname = 'Members can update conversation metadata') then
    create policy "Members can update conversation metadata"
    on public.conversations
    for update
    using (public.is_conversation_member(id, auth.uid()))
    with check (public.is_conversation_member(id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_members' and policyname = 'Members can read conversation members') then
    create policy "Members can read conversation members"
    on public.conversation_members
    for select
    using (public.is_conversation_member(conversation_id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_members' and policyname = 'Users can join conversations they create') then
    create policy "Users can join conversations they create"
    on public.conversation_members
    for insert
    with check (
      auth.uid() = user_id
      or exists (
        select 1
        from public.conversations
        where conversations.id = conversation_members.conversation_id
          and conversations.created_by = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conversation_members' and policyname = 'Users can update their own membership') then
    create policy "Users can update their own membership"
    on public.conversation_members
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Members can read messages') then
    create policy "Members can read messages"
    on public.messages
    for select
    using (public.is_conversation_member(conversation_id, auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'Members can send messages') then
    create policy "Members can send messages"
    on public.messages
    for insert
    with check (
      auth.uid() = sender_id
      and public.is_conversation_member(conversation_id, auth.uid())
    );
  end if;
end;
$$;

revoke all on function public.is_conversation_member(uuid, uuid) from public;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
