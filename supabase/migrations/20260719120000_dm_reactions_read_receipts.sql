-- DM reactions and read-receipt delivery tracking.

alter table public.messages
  add column if not exists delivered_at timestamptz;

create index if not exists messages_conversation_delivered_idx
  on public.messages (conversation_id, delivered_at)
  where delivered_at is null;

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint message_reactions_unique_user_emoji unique (message_id, user_id, emoji)
);

create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id, created_at);

create index if not exists message_reactions_user_idx
  on public.message_reactions (user_id, created_at desc);

alter table public.message_reactions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'message_reactions'
      and policyname = 'Members can read message reactions'
  ) then
    create policy "Members can read message reactions"
    on public.message_reactions
    for select
    using (
      exists (
        select 1
        from public.messages m
        where m.id = message_reactions.message_id
          and public.is_conversation_member(m.conversation_id, auth.uid())
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'message_reactions'
      and policyname = 'Members can add their message reactions'
  ) then
    create policy "Members can add their message reactions"
    on public.message_reactions
    for insert
    with check (
      auth.uid() = user_id
      and exists (
        select 1
        from public.messages m
        where m.id = message_reactions.message_id
          and public.is_conversation_member(m.conversation_id, auth.uid())
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'message_reactions'
      and policyname = 'Users can delete their message reactions'
  ) then
    create policy "Users can delete their message reactions"
    on public.message_reactions
    for delete
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'messages'
      and policyname = 'Recipients can mark messages delivered'
  ) then
    create policy "Recipients can mark messages delivered"
    on public.messages
    for update
    using (
      public.is_conversation_member(conversation_id, auth.uid())
      and sender_id <> auth.uid()
    )
    with check (
      public.is_conversation_member(conversation_id, auth.uid())
      and sender_id <> auth.uid()
    );
  end if;
end;
$$;
