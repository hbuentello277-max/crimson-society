begin;

-- post-media bucket
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can upload post media" on storage.objects;
drop policy if exists "Users can read their own post media" on storage.objects;
drop policy if exists "Users can update their own post media" on storage.objects;
drop policy if exists "Users can delete their own post media" on storage.objects;
drop policy if exists "Post media is publicly readable" on storage.objects;

create policy "Post media is publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'post-media');

create policy "Users can upload post media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own post media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own post media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Avatar images are public" on storage.objects;
drop policy if exists "Avatar images are publicly readable" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can upload own avatar images" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can update own avatar images" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;
drop policy if exists "Users can delete own avatar images" on storage.objects;

create policy "Avatar images are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "Users can upload own avatar images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own avatar images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own avatar images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;