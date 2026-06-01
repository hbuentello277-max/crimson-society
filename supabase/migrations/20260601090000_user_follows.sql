create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists user_follows_follower_created_idx
on public.user_follows (follower_id, created_at desc);

create index if not exists user_follows_following_created_idx
on public.user_follows (following_id, created_at desc);

alter table public.user_follows enable row level security;

drop policy if exists "Authenticated users can read follow relationships" on public.user_follows;
create policy "Authenticated users can read follow relationships"
on public.user_follows
for select
to authenticated
using (true);

drop policy if exists "Users can follow as themselves" on public.user_follows;
create policy "Users can follow as themselves"
on public.user_follows
for insert
to authenticated
with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
);

drop policy if exists "Users can unfollow as themselves" on public.user_follows;
create policy "Users can unfollow as themselves"
on public.user_follows
for delete
to authenticated
using (follower_id = auth.uid());

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (
  type in (
    'meet_joined',
    'meet_left',
    'meet_chat_message',
    'meet_chat_photo',
    'profile_followed'
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
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(new.follower_id), 'Crimson Member');

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    actor_id
  )
  values (
    new.following_id,
    'profile_followed',
    'New follower',
    actor_name || ' started following you.',
    new.follower_id
  );

  return new;
end;
$$;

drop trigger if exists create_profile_follow_notification_after_insert on public.user_follows;
create trigger create_profile_follow_notification_after_insert
after insert on public.user_follows
for each row
execute function public.create_profile_follow_notification();

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_follows'
  ) then
    execute 'alter publication supabase_realtime add table public.user_follows';
  end if;
end;
$$;

grant select, insert, delete on public.user_follows to authenticated;
grant all on public.user_follows to service_role;
