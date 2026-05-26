-- Production audit hardening: profile privileges, garage storage, avatars, and
-- Blackcard plan metadata.

alter table public.membership_plans
  add column if not exists stripe_price_id text;

create index if not exists subscriptions_user_active_period_idx
  on public.subscriptions (user_id, status, current_period_end desc);

create table if not exists public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  name text,
  year text,
  finish text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.motorcycles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.motorcycles add column if not exists label text;
alter table public.motorcycles add column if not exists name text;
alter table public.motorcycles add column if not exists year text;
alter table public.motorcycles add column if not exists finish text;
alter table public.motorcycles add column if not exists created_at timestamptz not null default now();
alter table public.motorcycles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists motorcycles_user_id_label_key
  on public.motorcycles (user_id, label);

drop trigger if exists touch_motorcycles_updated_at on public.motorcycles;
create trigger touch_motorcycles_updated_at
before update on public.motorcycles
for each row execute function public.touch_updated_at();

alter table public.motorcycles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'motorcycles'
      and policyname = 'Users can read their own motorcycles'
  ) then
    create policy "Users can read their own motorcycles"
    on public.motorcycles
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'motorcycles'
      and policyname = 'Users can create their own motorcycles'
  ) then
    create policy "Users can create their own motorcycles"
    on public.motorcycles
    for insert
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'motorcycles'
      and policyname = 'Users can update their own motorcycles'
  ) then
    create policy "Users can update their own motorcycles"
    on public.motorcycles
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'motorcycles'
      and policyname = 'Users can delete their own motorcycles'
  ) then
    create policy "Users can delete their own motorcycles"
    on public.motorcycles
    for delete
    using (auth.uid() = user_id);
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
before update on public.profiles
for each row execute function public.prevent_profile_privilege_self_update();

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Avatar images are public'
  ) then
    create policy "Avatar images are public"
    on storage.objects
    for select
    using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload their own avatar'
  ) then
    create policy "Users can upload their own avatar"
    on storage.objects
    for insert
    with check (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update their own avatar'
  ) then
    create policy "Users can update their own avatar"
    on storage.objects
    for update
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    with check (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete their own avatar'
  ) then
    create policy "Users can delete their own avatar"
    on storage.objects
    for delete
    using (
      bucket_id = 'avatars'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text not null default '',
  price numeric(10, 2) not null default 0,
  category text not null default 'tees',
  images text[] not null default '{}',
  sizes text[] not null default '{}',
  badge text,
  status text not null default 'coming_soon',
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists name text;
alter table public.products add column if not exists slug text;
alter table public.products add column if not exists tagline text not null default '';
alter table public.products add column if not exists price numeric(10, 2) not null default 0;
alter table public.products add column if not exists category text not null default 'tees';
alter table public.products add column if not exists images text[] not null default '{}';
alter table public.products add column if not exists sizes text[] not null default '{}';
alter table public.products add column if not exists badge text;
alter table public.products add column if not exists status text not null default 'coming_soon';
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists sort_order integer not null default 0;
alter table public.products add column if not exists created_at timestamptz not null default now();
alter table public.products add column if not exists updated_at timestamptz not null default now();

create unique index if not exists products_slug_key on public.products (slug);

drop trigger if exists touch_products_updated_at on public.products;
create trigger touch_products_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Products are readable'
  ) then
    create policy "Products are readable"
    on public.products
    for select
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Admins can manage products'
  ) then
    create policy "Admins can manage products"
    on public.products
    for all
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    )
    with check (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;
end;
$$;

