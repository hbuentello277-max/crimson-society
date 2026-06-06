-- Require active accounts for all user-owned storage writes.

drop policy if exists "Users can upload own avatar images" on storage.objects;
create policy "Users can upload own avatar images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own avatar images" on storage.objects;
create policy "Users can update own avatar images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own avatar images" on storage.objects;
create policy "Users can delete own avatar images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload post media" on storage.objects;
create policy "Users can upload post media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'post-media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own post media" on storage.objects;
create policy "Users can update their own post media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'post-media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'post-media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own post media" on storage.objects;
create policy "Users can delete their own post media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'post-media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload their own garage bike photos" on storage.objects;
create policy "Users can upload their own garage bike photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'garage-bike-photos'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own garage bike photos" on storage.objects;
create policy "Users can update their own garage bike photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'garage-bike-photos'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'garage-bike-photos'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own garage bike photos" on storage.objects;
create policy "Users can delete their own garage bike photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'garage-bike-photos'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload ride covers" on storage.objects;
create policy "Users can upload ride covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ride-covers'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update ride covers" on storage.objects;
create policy "Users can update ride covers"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ride-covers'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'ride-covers'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete ride covers" on storage.objects;
create policy "Users can delete ride covers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ride-covers'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload ride chat media" on storage.objects;
create policy "Users can upload ride chat media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ride-chat-media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update ride chat media" on storage.objects;
create policy "Users can update ride chat media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ride-chat-media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'ride-chat-media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete ride chat media" on storage.objects;
create policy "Users can delete ride chat media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ride-chat-media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own media originals" on storage.objects;
drop policy if exists "Users can upload their own media originals" on storage.objects;
create policy "Users can upload own media originals"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media-originals'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can replace their own media originals" on storage.objects;
create policy "Users can replace their own media originals"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media-originals'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'media-originals'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own media originals" on storage.objects;
create policy "Users can delete their own media originals"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media-originals'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own media renders" on storage.objects;
create policy "Users can upload own media renders"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media-renders'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);
