create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  full_name text,
  avatar_url text,
  profile_image_url text,
  bio text,
  location text,
  city text,
  state text,
  riding_area text,
  bike_type text,
  riding_style text,
  website text,
  instagram text,
  tiktok text,
  youtube text,
  website_url text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  quote text,
  role text not null default 'user',
  status text not null default 'active',
  is_admin boolean not null default false,
  membership_status text not null default 'inactive',
  membership_tier text,
  profile_tags text[] not null default '{}',
  hide_location_from_suggestions boolean not null default false,
  hide_from_suggestions boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists instagram text;
alter table public.profiles add column if not exists tiktok text;
alter table public.profiles add column if not exists youtube text;
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

do $$
declare
  profile_id_type text;
begin
  select data_type
  into profile_id_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'id';

  if profile_id_type <> 'uuid' then
    raise exception 'public.profiles.id must be uuid, found %', profile_id_type;
  end if;
end;
$$;

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
  coalesce(users.raw_user_meta_data->>'display_name', users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name', 'Crimson Member'),
  coalesce(users.raw_user_meta_data->>'display_name', users.raw_user_meta_data->>'full_name', users.raw_user_meta_data->>'name', 'Crimson Member'),
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

create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null and username <> '';

create index if not exists profiles_discovery_region_idx
  on public.profiles (city, state)
  where status = 'active' and hide_from_suggestions = false;

create index if not exists profiles_discovery_style_idx
  on public.profiles (riding_style, bike_type)
  where status = 'active' and hide_from_suggestions = false;

update public.profiles
set
  website_url = coalesce(website_url, website),
  instagram_url = coalesce(instagram_url, instagram),
  tiktok_url = coalesce(tiktok_url, tiktok),
  youtube_url = coalesce(youtube_url, youtube),
  website = coalesce(website, website_url),
  instagram = coalesce(instagram, instagram_url),
  tiktok = coalesce(tiktok, tiktok_url),
  youtube = coalesce(youtube, youtube_url),
  city = coalesce(city, nullif(trim(split_part(location, ',', 1)), '')),
  state = coalesce(state, nullif(trim(split_part(location, ',', 2)), '')),
  riding_area = coalesce(riding_area, nullif(trim(location), '')),
  full_name = coalesce(full_name, display_name),
  is_admin = coalesce(is_admin, role = 'admin'),
  membership_status = coalesce(membership_status, 'inactive')
where true;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_profile_admin(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and (is_admin = true or role = 'admin')
      and status = 'active'
  );
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

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists prevent_profile_privilege_self_update on public.profiles;
create trigger prevent_profile_privilege_self_update
before insert or update on public.profiles
for each row execute function public.prevent_profile_privilege_self_update();

alter table public.profiles enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
  end loop;
end;
$$;

create policy "Profiles: users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Profiles: authenticated can read discoverable profiles"
on public.profiles
for select
to authenticated
using (
  status = 'active'
  and hide_from_suggestions = false
);

create policy "Profiles: conversation members can read participant profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members self_membership
    join public.conversation_members target_membership
      on target_membership.conversation_id = self_membership.conversation_id
    where self_membership.user_id = auth.uid()
      and target_membership.user_id = profiles.id
  )
);

create policy "Profiles: users can insert own profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'user'
  and status = 'active'
  and is_admin = false
  and membership_status = 'inactive'
);

create policy "Profiles: users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

revoke all on public.profiles from anon;
grant usage on schema public to anon;
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

grant select, insert, update, delete on public.user_connections to authenticated;
grant select, insert, update, delete on public.user_blocks to authenticated;
grant select, insert, update on public.conversations to authenticated;
grant select, insert, update on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;

grant all on public.user_connections to service_role;
grant all on public.user_blocks to service_role;
grant all on public.conversations to service_role;
grant all on public.conversation_members to service_role;
grant all on public.messages to service_role;

revoke all on function public.is_profile_admin(uuid) from public;
grant execute on function public.is_profile_admin(uuid) to authenticated;

notify pgrst, 'reload schema';
