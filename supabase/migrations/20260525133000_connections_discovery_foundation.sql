create extension if not exists pgcrypto;

alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists riding_area text;
alter table public.profiles add column if not exists bike_type text;
alter table public.profiles add column if not exists riding_style text;
alter table public.profiles add column if not exists profile_tags text[] not null default '{}';
alter table public.profiles add column if not exists hide_location_from_suggestions boolean not null default false;
alter table public.profiles add column if not exists hide_from_suggestions boolean not null default false;

create index if not exists profiles_discovery_region_idx
  on public.profiles (city, state)
  where status = 'active' and hide_from_suggestions = false;

create index if not exists profiles_discovery_style_idx
  on public.profiles (riding_style, bike_type)
  where status = 'active' and hide_from_suggestions = false;

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self_check check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

alter table public.user_blocks add column if not exists blocker_id uuid references auth.users(id) on delete cascade;
alter table public.user_blocks add column if not exists blocked_id uuid references auth.users(id) on delete cascade;
alter table public.user_blocks add column if not exists reason text;
alter table public.user_blocks add column if not exists created_at timestamptz not null default now();

create unique index if not exists user_blocks_blocker_blocked_key
  on public.user_blocks (blocker_id, blocked_id);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id, created_at desc);

create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  connection_key text not null unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint user_connections_no_self_check check (requester_id <> addressee_id),
  constraint user_connections_status_check check (status in ('pending', 'accepted', 'declined'))
);

alter table public.user_connections add column if not exists requester_id uuid references auth.users(id) on delete cascade;
alter table public.user_connections add column if not exists addressee_id uuid references auth.users(id) on delete cascade;
alter table public.user_connections add column if not exists connection_key text;
alter table public.user_connections add column if not exists status text not null default 'pending';
alter table public.user_connections add column if not exists created_at timestamptz not null default now();
alter table public.user_connections add column if not exists updated_at timestamptz not null default now();
alter table public.user_connections add column if not exists accepted_at timestamptz;

create unique index if not exists user_connections_connection_key_key
  on public.user_connections (connection_key);

create index if not exists user_connections_requester_idx
  on public.user_connections (requester_id, status, created_at desc);

create index if not exists user_connections_addressee_idx
  on public.user_connections (addressee_id, status, created_at desc);

create or replace function public.users_are_blocked(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_blocks
    where (blocker_id = first_user_id and blocked_id = second_user_id)
       or (blocker_id = second_user_id and blocked_id = first_user_id)
  );
$$;

create or replace function public.users_are_connected(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_connections
    where status = 'accepted'
      and (
        (requester_id = first_user_id and addressee_id = second_user_id)
        or (requester_id = second_user_id and addressee_id = first_user_id)
      )
  );
$$;

create or replace function public.connection_key_for(first_user_id uuid, second_user_id uuid)
returns text
language sql
immutable
as $$
  select least(first_user_id::text, second_user_id::text) || ':' || greatest(first_user_id::text, second_user_id::text);
$$;

drop trigger if exists touch_user_connections_updated_at on public.user_connections;
create trigger touch_user_connections_updated_at
before update on public.user_connections
for each row execute function public.touch_updated_at();

alter table public.user_blocks enable row level security;
alter table public.user_connections enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_blocks' and policyname = 'Users can read their own blocks') then
    create policy "Users can read their own blocks"
    on public.user_blocks
    for select
    using (auth.uid() = blocker_id or auth.uid() = blocked_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_blocks' and policyname = 'Users can block others') then
    create policy "Users can block others"
    on public.user_blocks
    for insert
    with check (auth.uid() = blocker_id and blocker_id <> blocked_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_blocks' and policyname = 'Users can remove their own blocks') then
    create policy "Users can remove their own blocks"
    on public.user_blocks
    for delete
    using (auth.uid() = blocker_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_connections' and policyname = 'Users can read their own connections') then
    create policy "Users can read their own connections"
    on public.user_connections
    for select
    using (auth.uid() = requester_id or auth.uid() = addressee_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_connections' and policyname = 'Users can request connections') then
    create policy "Users can request connections"
    on public.user_connections
    for insert
    with check (
      auth.uid() = requester_id
      and requester_id <> addressee_id
      and connection_key = public.connection_key_for(requester_id, addressee_id)
      and status = 'pending'
      and not public.users_are_blocked(requester_id, addressee_id)
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'user_connections' and policyname = 'Users can respond to connection requests') then
    create policy "Users can respond to connection requests"
    on public.user_connections
    for update
    using (auth.uid() = requester_id or auth.uid() = addressee_id)
    with check (
      auth.uid() = requester_id
      or (
        auth.uid() = addressee_id
        and status in ('accepted', 'declined')
        and not public.users_are_blocked(requester_id, addressee_id)
      )
    );
  end if;
end;
$$;

drop policy if exists "Users can join conversations they create" on public.conversation_members;
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
      and not public.users_are_blocked(auth.uid(), conversation_members.user_id)
  )
);

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
with check (
  auth.uid() = sender_id
  and public.is_conversation_member(conversation_id, auth.uid())
  and not exists (
    select 1
    from public.conversation_members other_members
    where other_members.conversation_id = messages.conversation_id
      and other_members.user_id <> auth.uid()
      and public.users_are_blocked(auth.uid(), other_members.user_id)
  )
);

revoke all on function public.users_are_blocked(uuid, uuid) from public;
revoke all on function public.users_are_connected(uuid, uuid) from public;
revoke all on function public.connection_key_for(uuid, uuid) from public;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;
grant execute on function public.users_are_connected(uuid, uuid) to authenticated;
grant execute on function public.connection_key_for(uuid, uuid) to authenticated;
