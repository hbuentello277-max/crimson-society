create extension if not exists pgcrypto;

create table if not exists public.sound_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sound_categories add column if not exists name text;
alter table public.sound_categories add column if not exists slug text;
alter table public.sound_categories add column if not exists sort_order integer not null default 0;
alter table public.sound_categories add column if not exists created_at timestamptz not null default now();
alter table public.sound_categories add column if not exists updated_at timestamptz not null default now();

create unique index if not exists sound_categories_slug_key
  on public.sound_categories (slug);

create table if not exists public.sounds (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  description text,
  duration_seconds integer,
  cover_image_url text,
  audio_url text,
  preview_url text,
  waveform jsonb,
  provider text not null default 'internal',
  license_type text not null default 'app_owned',
  license_notes text,
  rights_expires_at timestamptz,
  uploaded_by uuid references auth.users(id) on delete set null,
  category_id uuid references public.sound_categories(id) on delete set null,
  approved boolean not null default false,
  featured boolean not null default false,
  explicit boolean not null default false,
  usage_count integer not null default 0,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sounds add column if not exists title text;
alter table public.sounds add column if not exists artist text;
alter table public.sounds add column if not exists description text;
alter table public.sounds add column if not exists duration_seconds integer;
alter table public.sounds add column if not exists cover_image_url text;
alter table public.sounds add column if not exists audio_url text;
alter table public.sounds add column if not exists preview_url text;
alter table public.sounds add column if not exists waveform jsonb;
alter table public.sounds add column if not exists provider text not null default 'internal';
alter table public.sounds add column if not exists license_type text not null default 'app_owned';
alter table public.sounds add column if not exists license_notes text;
alter table public.sounds add column if not exists rights_expires_at timestamptz;
alter table public.sounds add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.sounds add column if not exists category_id uuid references public.sound_categories(id) on delete set null;
alter table public.sounds add column if not exists approved boolean not null default false;
alter table public.sounds add column if not exists featured boolean not null default false;
alter table public.sounds add column if not exists explicit boolean not null default false;
alter table public.sounds add column if not exists usage_count integer not null default 0;
alter table public.sounds add column if not exists disabled_at timestamptz;
alter table public.sounds add column if not exists created_at timestamptz not null default now();
alter table public.sounds add column if not exists updated_at timestamptz not null default now();

create index if not exists sounds_approved_featured_idx
  on public.sounds (approved, featured, usage_count desc, created_at desc)
  where disabled_at is null;

create index if not exists sounds_category_idx
  on public.sounds (category_id);

create table if not exists public.post_sounds (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public."Posts"(id) on delete cascade,
  sound_id uuid not null references public.sounds(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_time_seconds numeric(8, 3) not null default 0,
  volume numeric(4, 3) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id)
);

alter table public.post_sounds add column if not exists post_id uuid references public."Posts"(id) on delete cascade;
alter table public.post_sounds add column if not exists sound_id uuid references public.sounds(id) on delete restrict;
alter table public.post_sounds add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.post_sounds add column if not exists start_time_seconds numeric(8, 3) not null default 0;
alter table public.post_sounds add column if not exists volume numeric(4, 3) not null default 1;
alter table public.post_sounds add column if not exists created_at timestamptz not null default now();
alter table public.post_sounds add column if not exists updated_at timestamptz not null default now();

create unique index if not exists post_sounds_post_id_key
  on public.post_sounds (post_id);

create index if not exists post_sounds_sound_id_idx
  on public.post_sounds (sound_id, created_at desc);

create index if not exists post_sounds_user_id_idx
  on public.post_sounds (user_id, created_at desc);

create table if not exists public.sound_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sound_id uuid not null references public.sounds(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, sound_id)
);

alter table public.sound_favorites add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.sound_favorites add column if not exists sound_id uuid references public.sounds(id) on delete cascade;
alter table public.sound_favorites add column if not exists created_at timestamptz not null default now();

create unique index if not exists sound_favorites_user_sound_key
  on public.sound_favorites (user_id, sound_id);

create or replace function public.increment_sound_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sounds
  set usage_count = greatest(usage_count + 1, 0),
      updated_at = now()
  where id = new.sound_id;

  return new;
end;
$$;

drop trigger if exists increment_sound_usage_after_insert on public.post_sounds;
create trigger increment_sound_usage_after_insert
after insert on public.post_sounds
for each row execute function public.increment_sound_usage();

create or replace function public.decrement_sound_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sounds
  set usage_count = greatest(usage_count - 1, 0),
      updated_at = now()
  where id = old.sound_id;

  return old;
end;
$$;

drop trigger if exists decrement_sound_usage_after_delete on public.post_sounds;
create trigger decrement_sound_usage_after_delete
after delete on public.post_sounds
for each row execute function public.decrement_sound_usage();

drop trigger if exists touch_sound_categories_updated_at on public.sound_categories;
create trigger touch_sound_categories_updated_at
before update on public.sound_categories
for each row execute function public.touch_updated_at();

drop trigger if exists touch_sounds_updated_at on public.sounds;
create trigger touch_sounds_updated_at
before update on public.sounds
for each row execute function public.touch_updated_at();

drop trigger if exists touch_post_sounds_updated_at on public.post_sounds;
create trigger touch_post_sounds_updated_at
before update on public.post_sounds
for each row execute function public.touch_updated_at();

insert into public.sound_categories (name, slug, sort_order)
values
  ('Featured', 'featured', 10),
  ('Night Ride', 'night-ride', 20),
  ('Cinematic', 'cinematic', 30),
  ('Engine Room', 'engine-room', 40)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('sound-originals', 'sound-originals', false, 104857600, array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/webm']),
  ('sound-renders', 'sound-renders', true, 52428800, array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.sound_categories enable row level security;
alter table public.sounds enable row level security;
alter table public.post_sounds enable row level security;
alter table public.sound_favorites enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sound_categories' and policyname = 'Sound categories are readable') then
    create policy "Sound categories are readable"
    on public.sound_categories
    for select
    using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sound_categories' and policyname = 'Admins can manage sound categories') then
    create policy "Admins can manage sound categories"
    on public.sound_categories
    for all
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    )
    with check (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sounds' and policyname = 'Approved sounds are readable') then
    create policy "Approved sounds are readable"
    on public.sounds
    for select
    using (approved = true and disabled_at is null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sounds' and policyname = 'Admins can manage sounds') then
    create policy "Admins can manage sounds"
    on public.sounds
    for all
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    )
    with check (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'post_sounds' and policyname = 'Post sounds are readable for approved sounds') then
    create policy "Post sounds are readable for approved sounds"
    on public.post_sounds
    for select
    using (
      exists (
        select 1 from public.sounds
        where sounds.id = post_sounds.sound_id
          and sounds.approved = true
          and sounds.disabled_at is null
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'post_sounds' and policyname = 'Users can attach approved sounds to their own posts') then
    create policy "Users can attach approved sounds to their own posts"
    on public.post_sounds
    for insert
    with check (
      auth.uid() = user_id
      and exists (
        select 1 from public."Posts"
        where "Posts".id = post_sounds.post_id
          and "Posts".user_id = auth.uid()
      )
      and exists (
        select 1 from public.sounds
        where sounds.id = post_sounds.sound_id
          and sounds.approved = true
          and sounds.disabled_at is null
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'post_sounds' and policyname = 'Users can update sounds on their own posts') then
    create policy "Users can update sounds on their own posts"
    on public.post_sounds
    for update
    using (
      auth.uid() = user_id
      and exists (
        select 1 from public."Posts"
        where "Posts".id = post_sounds.post_id
          and "Posts".user_id = auth.uid()
      )
    )
    with check (
      auth.uid() = user_id
      and exists (
        select 1 from public.sounds
        where sounds.id = post_sounds.sound_id
          and sounds.approved = true
          and sounds.disabled_at is null
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'post_sounds' and policyname = 'Users can remove sounds from their own posts') then
    create policy "Users can remove sounds from their own posts"
    on public.post_sounds
    for delete
    using (
      auth.uid() = user_id
      and exists (
        select 1 from public."Posts"
        where "Posts".id = post_sounds.post_id
          and "Posts".user_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sound_favorites' and policyname = 'Users can read their own sound favorites') then
    create policy "Users can read their own sound favorites"
    on public.sound_favorites
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sound_favorites' and policyname = 'Users can favorite approved sounds') then
    create policy "Users can favorite approved sounds"
    on public.sound_favorites
    for insert
    with check (
      auth.uid() = user_id
      and exists (
        select 1 from public.sounds
        where sounds.id = sound_favorites.sound_id
          and sounds.approved = true
          and sounds.disabled_at is null
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sound_favorites' and policyname = 'Users can remove their own sound favorites') then
    create policy "Users can remove their own sound favorites"
    on public.sound_favorites
    for delete
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public can read sound renders') then
    create policy "Public can read sound renders"
    on storage.objects
    for select
    using (bucket_id = 'sound-renders');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins can upload sound originals') then
    create policy "Admins can upload sound originals"
    on storage.objects
    for insert
    with check (
      bucket_id = 'sound-originals'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins can manage sound renders') then
    create policy "Admins can manage sound renders"
    on storage.objects
    for all
    using (
      bucket_id = 'sound-renders'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    )
    with check (
      bucket_id = 'sound-renders'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;
end;
$$;
