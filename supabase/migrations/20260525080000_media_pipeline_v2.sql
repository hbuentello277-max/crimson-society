create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_kind text not null check (media_kind in ('image', 'video')),
  source_bucket text not null,
  source_path text not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'failed')),
  attempts integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_processing_jobs_status_created_at_idx
  on public.media_processing_jobs (status, created_at);

create index if not exists media_processing_jobs_user_id_idx
  on public.media_processing_jobs (user_id);

drop trigger if exists touch_media_processing_jobs_updated_at on public.media_processing_jobs;
create trigger touch_media_processing_jobs_updated_at
before update on public.media_processing_jobs
for each row execute function public.touch_updated_at();

alter table public.media_processing_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_processing_jobs'
      and policyname = 'Users can read their own media jobs'
  ) then
    create policy "Users can read their own media jobs"
    on public.media_processing_jobs
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'media_processing_jobs'
      and policyname = 'Users can queue their own media jobs'
  ) then
    create policy "Users can queue their own media jobs"
    on public.media_processing_jobs
    for insert
    with check (auth.uid() = user_id);
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'media-originals',
    'media-originals',
    false,
    805306368,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'video/mp4',
      'video/quicktime',
      'video/x-m4v',
      'video/webm'
    ]
  ),
  (
    'media-renders',
    'media-renders',
    true,
    104857600,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'application/vnd.apple.mpegurl',
      'video/mp2t'
    ]
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
      and policyname = 'Users can upload their own media originals'
  ) then
    create policy "Users can upload their own media originals"
    on storage.objects
    for insert
    with check (
      bucket_id = 'media-originals'
      and auth.role() = 'authenticated'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can read their own media originals'
  ) then
    create policy "Users can read their own media originals"
    on storage.objects
    for select
    using (
      bucket_id = 'media-originals'
      and auth.role() = 'authenticated'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can replace their own media originals'
  ) then
    create policy "Users can replace their own media originals"
    on storage.objects
    for update
    using (
      bucket_id = 'media-originals'
      and auth.role() = 'authenticated'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'media-originals'
      and auth.role() = 'authenticated'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read processed media renders'
  ) then
    create policy "Public can read processed media renders"
    on storage.objects
    for select
    using (bucket_id = 'media-renders');
  end if;
end;
$$;

alter table public."Posts" add column if not exists media_pipeline_version integer not null default 1;
alter table public."Posts" add column if not exists media_status text not null default 'ready';
alter table public."Posts" add column if not exists media_metadata jsonb not null default '{}'::jsonb;
alter table public."Posts" add column if not exists image_original_bucket text;
alter table public."Posts" add column if not exists image_original_path text;
alter table public."Posts" add column if not exists image_display_url text;
alter table public."Posts" add column if not exists image_thumbnail_url text;
alter table public."Posts" add column if not exists video_original_bucket text;
alter table public."Posts" add column if not exists video_original_path text;
alter table public."Posts" add column if not exists video_playback_url text;
alter table public."Posts" add column if not exists video_hls_url text;
alter table public."Posts" add column if not exists video_thumbnail_url text;

create index if not exists posts_media_status_created_at_idx
  on public."Posts" (media_status, created_at desc);

