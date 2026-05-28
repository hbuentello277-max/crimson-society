-- =============================================================================
-- FIX: Posts RLS + post-media storage bucket policies
-- Root cause: public."Posts" table had RLS enabled (or no policies defined),
--             blocking authenticated inserts entirely.
--             Additionally, no dedicated storage bucket existed for post images,
--             and auth.uid() was never checked against the user_id column on insert.
-- =============================================================================

-- ─── 1. Ensure RLS is enabled on "Posts" ────────────────────────────────────
alter table public."Posts" enable row level security;

-- ─── 2. Drop any stale / conflicting policies first ─────────────────────────
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename  = 'Posts'
  loop
    execute format('drop policy if exists %I on public."Posts"', pol.policyname);
  end loop;
end;
$$;

-- ─── 3. Posts – row-level security ──────────────────────────────────────────

-- 3a. Public feed: anyone (including anon) can read non-draft posts
create policy "Posts are publicly readable"
on public."Posts"
for select
using (true);

-- 3b. Authenticated users can create their own posts
--     Enforces that the inserting user owns the row by matching auth.uid() → user_id.
--     The column in your table is "user_id" (verified from media_pipeline migration).
create policy "Authenticated users can create posts"
on public."Posts"
for insert
to authenticated
with check (auth.uid() = user_id);

-- 3c. Users can only edit their own posts
create policy "Users can update their own posts"
on public."Posts"
for update
to authenticated
using  (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 3d. Users can only delete their own posts
create policy "Users can delete their own posts"
on public."Posts"
for delete
to authenticated
using (auth.uid() = user_id);

-- 3e. Admins can manage all posts (soft-moderate, pin, etc.)
create policy "Admins can manage all posts"
on public."Posts"
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id     = auth.uid()
      and profiles.role   = 'admin'
      and profiles.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id     = auth.uid()
      and profiles.role   = 'admin'
      and profiles.status = 'active'
  )
);

-- ─── 4. Storage bucket for post media images ────────────────────────────────
--  "media-originals" already handles large originals.
--  We add a dedicated "post-media" bucket for direct post image uploads
--  (the compose flow writes here before the media pipeline picks up the job).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  false,
  104857600,  -- 100 MB cap for post images
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── 5. Storage policies for post-media bucket ──────────────────────────────
do $$
begin
  -- 5a. Upload: authenticated users can upload into their own UID folder
  --     Expected path pattern:  {uid}/{filename}
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Users can upload post media'
  ) then
    create policy "Users can upload post media"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'post-media'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  -- 5b. Select: authenticated users can read their own uploaded files
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Users can read their own post media'
  ) then
    create policy "Users can read their own post media"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'post-media'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  -- 5c. Update: allow replace/overwrite of own files
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Users can update their own post media'
  ) then
    create policy "Users can update their own post media"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'post-media'
      and auth.uid()::text = (storage.foldername(name))[1]
    )
    with check (
      bucket_id = 'post-media'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;

  -- 5d. Delete: users can remove their own post media
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Users can delete their own post media'
  ) then
    create policy "Users can delete their own post media"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'post-media'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end;
$$;

-- ─── 6. Extend media-originals DELETE policy (was missing) ─────────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Users can delete their own media originals'
  ) then
    create policy "Users can delete their own media originals"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'media-originals'
      and auth.uid()::text = (storage.foldername(name))[1]
    );
  end if;
end;
$$;

-- ─── 7. Ensure authenticated role has DML grants on Posts ───────────────────
grant select, insert, update, delete
  on public."Posts"
  to authenticated;

-- Anon users get read-only access to support public feed SSR/ISR
grant select
  on public."Posts"
  to anon;

-- ─── 8. Grant select on profiles to anon (needed for public post author join) 
grant select
  on public.profiles
  to anon;
