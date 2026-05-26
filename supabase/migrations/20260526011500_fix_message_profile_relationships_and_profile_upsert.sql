create extension if not exists pgcrypto;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists profile_image_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists riding_area text;
alter table public.profiles add column if not exists bike_type text;
alter table public.profiles add column if not exists riding_style text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists instagram_url text;
alter table public.profiles add column if not exists tiktok_url text;
alter table public.profiles add column if not exists youtube_url text;
alter table public.profiles add column if not exists quote text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists membership_status text not null default 'inactive';
alter table public.profiles add column if not exists membership_tier text;
alter table public.profiles add column if not exists profile_tags text[] not null default '{}';
alter table public.profiles add column if not exists hide_location_from_suggestions boolean not null default false;
alter table public.profiles add column if not exists hide_from_suggestions boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

insert into public.profiles (
  id,
  username,
  display_name,
  full_name,
  avatar_url,
  profile_image_url,
  role,
  status,
  is_admin,
  membership_status
)
select
  users.id,
  nullif(regexp_replace(lower(split_part(coalesce(users.email, 'member'), '@', 1)), '[^a-z0-9._-]', '', 'g'), ''),
  coalesce(users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name', split_part(coalesce(users.email, 'Crimson Member'), '@', 1)),
  coalesce(users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name', split_part(coalesce(users.email, 'Crimson Member'), '@', 1)),
  users.raw_user_meta_data->>'avatar_url',
  users.raw_user_meta_data->>'avatar_url',
  'user',
  'active',
  false,
  'inactive'
from auth.users users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.id = users.id
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversation_members_user_id_profiles_fkey'
      and conrelid = 'public.conversation_members'::regclass
  ) then
    alter table public.conversation_members
      add constraint conversation_members_user_id_profiles_fkey
      foreign key (user_id)
      references public.profiles(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_sender_id_profiles_fkey'
      and conrelid = 'public.messages'::regclass
  ) then
    alter table public.messages
      add constraint messages_sender_id_profiles_fkey
      foreign key (sender_id)
      references public.profiles(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_connections_requester_id_profiles_fkey'
      and conrelid = 'public.user_connections'::regclass
  ) then
    alter table public.user_connections
      add constraint user_connections_requester_id_profiles_fkey
      foreign key (requester_id)
      references public.profiles(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_connections_addressee_id_profiles_fkey'
      and conrelid = 'public.user_connections'::regclass
  ) then
    alter table public.user_connections
      add constraint user_connections_addressee_id_profiles_fkey
      foreign key (addressee_id)
      references public.profiles(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_blocks_blocker_id_profiles_fkey'
      and conrelid = 'public.user_blocks'::regclass
  ) then
    alter table public.user_blocks
      add constraint user_blocks_blocker_id_profiles_fkey
      foreign key (blocker_id)
      references public.profiles(id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_blocks_blocked_id_profiles_fkey'
      and conrelid = 'public.user_blocks'::regclass
  ) then
    alter table public.user_blocks
      add constraint user_blocks_blocked_id_profiles_fkey
      foreign key (blocked_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end;
$$;

create or replace function public.prevent_profile_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role = coalesce(new.role, 'user');
    new.status = coalesce(new.status, 'active');
    new.is_admin = coalesce(new.is_admin, false);
    new.membership_status = coalesce(new.membership_status, 'inactive');

    if new.role <> 'user' or new.status <> 'active' or new.is_admin <> false then
      raise exception 'Profile role, status, and admin flags can only be set by admin controls.';
    end if;

    return new;
  end if;

  if auth.uid() = old.id and (
    new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.is_admin is distinct from old.is_admin
    or new.membership_status is distinct from old.membership_status
    or new.membership_tier is distinct from old.membership_tier
  ) then
    raise exception 'Profile privileged fields can only be changed by admin controls.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_privilege_self_update on public.profiles;
create trigger prevent_profile_privilege_self_update
before insert or update on public.profiles
for each row execute function public.prevent_profile_privilege_self_update();

drop policy if exists "Users can create their own standard profile" on public.profiles;
create policy "Users can create their own standard profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'user'
  and status = 'active'
  and is_admin = false
);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

notify pgrst, 'reload schema';
