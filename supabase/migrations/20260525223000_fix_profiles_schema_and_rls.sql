-- Root profile fix: guarantee discovery columns exist and rebuild profile RLS
-- without policies that can recursively query public.profiles.

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

update public.profiles
set
  city = nullif(trim(split_part(location, ',', 1)), ''),
  state = nullif(trim(split_part(location, ',', 2)), ''),
  riding_area = coalesce(riding_area, nullif(trim(location), '')),
  full_name = coalesce(full_name, display_name)
where location is not null
  and (city is null or riding_area is null or full_name is null);

create index if not exists profiles_discovery_region_idx
  on public.profiles (city, state)
  where status = 'active' and hide_from_suggestions = false;

create index if not exists profiles_discovery_style_idx
  on public.profiles (riding_style, bike_type)
  where status = 'active' and hide_from_suggestions = false;

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
    if coalesce(new.role, 'user') <> 'user'
      or coalesce(new.status, 'active') <> 'active' then
      raise exception 'Profile role and status can only be set by admin controls.';
    end if;

    return new;
  end if;

  if auth.uid() = old.id and (
    new.role is distinct from old.role or
    new.status is distinct from old.status
  ) then
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
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
  end loop;
end;
$$;

create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can create their own standard profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'user'
  and status = 'active'
);

create policy "Users can update their own profile fields"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.admin_update_profile_access(
  target_user_id uuid,
  new_role text,
  new_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_profile public.profiles;
  target_profile public.profiles;
  updated_profile public.profiles;
  active_admin_count integer;
begin
  if new_role not in ('user', 'moderator', 'admin') then
    raise exception 'Invalid role.';
  end if;

  if new_status not in ('active', 'limited', 'suspended', 'blocked') then
    raise exception 'Invalid status.';
  end if;

  select *
  into caller_profile
  from public.profiles
  where id = auth.uid();

  if caller_profile.role <> 'admin' or caller_profile.status <> 'active' then
    raise exception 'Admins only.';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = target_user_id;

  if target_profile.id is null then
    raise exception 'Profile not found.';
  end if;

  if target_profile.role = 'admin'
    and target_profile.status = 'active'
    and (new_role <> 'admin' or new_status <> 'active') then
    select count(*)
    into active_admin_count
    from public.profiles
    where role = 'admin'
      and status = 'active';

    if active_admin_count <= 1 then
      raise exception 'At least one active admin is required.';
    end if;
  end if;

  update public.profiles
  set role = new_role,
      status = new_status
  where id = target_user_id
  returning * into updated_profile;

  return updated_profile;
end;
$$;

revoke all on function public.admin_update_profile_access(uuid, text, text) from public;
grant execute on function public.admin_update_profile_access(uuid, text, text) to authenticated;
