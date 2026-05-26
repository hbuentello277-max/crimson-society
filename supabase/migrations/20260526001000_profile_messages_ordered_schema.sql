create extension if not exists pgcrypto;

-- Tables first so helper functions and policies never reference missing relations.
create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  connection_key text not null unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.user_connections add column if not exists requester_id uuid references auth.users(id) on delete cascade;
alter table public.user_connections add column if not exists addressee_id uuid references auth.users(id) on delete cascade;
alter table public.user_connections add column if not exists connection_key text;
alter table public.user_connections add column if not exists status text not null default 'pending';
alter table public.user_connections add column if not exists created_at timestamptz not null default now();
alter table public.user_connections add column if not exists updated_at timestamptz not null default now();
alter table public.user_connections add column if not exists accepted_at timestamptz;

create unique index if not exists user_connections_connection_key_key on public.user_connections (connection_key);
create index if not exists user_connections_requester_idx on public.user_connections (requester_id, status, created_at desc);
create index if not exists user_connections_addressee_idx on public.user_connections (addressee_id, status, created_at desc);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.user_blocks add column if not exists blocker_id uuid references auth.users(id) on delete cascade;
alter table public.user_blocks add column if not exists blocked_id uuid references auth.users(id) on delete cascade;
alter table public.user_blocks add column if not exists reason text;
alter table public.user_blocks add column if not exists created_at timestamptz not null default now();

create unique index if not exists user_blocks_blocker_blocked_key on public.user_blocks (blocker_id, blocked_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_connections_updated_at on public.user_connections;
create trigger touch_user_connections_updated_at
before update on public.user_connections
for each row execute function public.touch_updated_at();

create or replace function public.connection_key_for(first_user_id uuid, second_user_id uuid)
returns text
language sql
immutable
as $$
  select least(first_user_id::text, second_user_id::text) || ':' || greatest(first_user_id::text, second_user_id::text);
$$;

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

revoke all on function public.connection_key_for(uuid, uuid) from public;
revoke all on function public.users_are_blocked(uuid, uuid) from public;
revoke all on function public.users_are_connected(uuid, uuid) from public;
grant execute on function public.connection_key_for(uuid, uuid) to authenticated;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;
grant execute on function public.users_are_connected(uuid, uuid) to authenticated;

alter table public.user_connections enable row level security;
drop policy if exists "Users can read their own connections" on public.user_connections;
create policy "Users can read their own connections" on public.user_connections
for select to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Users can request connections" on public.user_connections;
create policy "Users can request connections" on public.user_connections
for insert to authenticated
with check (
  auth.uid() = requester_id
  and requester_id <> addressee_id
  and connection_key = public.connection_key_for(requester_id, addressee_id)
  and status = 'pending'
  and not public.users_are_blocked(requester_id, addressee_id)
);

drop policy if exists "Users can respond to connection requests" on public.user_connections;
create policy "Users can respond to connection requests" on public.user_connections
for update to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id)
with check (
  auth.uid() = requester_id
  or (
    auth.uid() = addressee_id
    and status in ('accepted', 'declined')
    and not public.users_are_blocked(requester_id, addressee_id)
  )
);

alter table public.user_blocks enable row level security;
drop policy if exists "Users can read their own blocks" on public.user_blocks;
create policy "Users can read their own blocks" on public.user_blocks
for select to authenticated
using (auth.uid() = blocker_id or auth.uid() = blocked_id);

drop policy if exists "Users can block others" on public.user_blocks;
create policy "Users can block others" on public.user_blocks
for insert to authenticated
with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

drop policy if exists "Users can remove their own blocks" on public.user_blocks;
create policy "Users can remove their own blocks" on public.user_blocks
for delete to authenticated
using (auth.uid() = blocker_id);

-- Profile schema and non-recursive RLS.
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
alter table public.profiles add column if not exists profile_tags text[] not null default '{}';
alter table public.profiles add column if not exists hide_location_from_suggestions boolean not null default false;
alter table public.profiles add column if not exists hide_from_suggestions boolean not null default false;
alter table public.profiles add column if not exists quote text;
alter table public.profiles add column if not exists instagram_url text;
alter table public.profiles add column if not exists tiktok_url text;
alter table public.profiles add column if not exists youtube_url text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_username_key on public.profiles (lower(username)) where username is not null and username <> '';
create index if not exists profiles_discovery_region_idx on public.profiles (city, state) where status = 'active' and hide_from_suggestions = false;
create index if not exists profiles_discovery_style_idx on public.profiles (riding_style, bike_type) where status = 'active' and hide_from_suggestions = false;

update public.profiles
set
  city = coalesce(city, nullif(trim(split_part(location, ',', 1)), '')),
  state = coalesce(state, nullif(trim(split_part(location, ',', 2)), '')),
  riding_area = coalesce(riding_area, nullif(trim(location), '')),
  full_name = coalesce(full_name, display_name)
where location is not null;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

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
    if coalesce(new.role, 'user') <> 'user' or coalesce(new.status, 'active') <> 'active' then
      raise exception 'Profile role and status can only be set by admin controls.';
    end if;
    return new;
  end if;

  if auth.uid() = old.id and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'Profile role and status can only be changed by admin controls.';
  end if;

  return new;
end;
$$;

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
    select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
  end loop;
end;
$$;

create policy "Authenticated users can read profiles" on public.profiles
for select to authenticated using (true);

create policy "Users can create their own standard profile" on public.profiles
for insert to authenticated
with check (auth.uid() = id and role = 'user' and status = 'active');

create policy "Users can update their own profile fields" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

notify pgrst, 'reload schema';
