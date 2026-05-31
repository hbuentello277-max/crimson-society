insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ride-covers',
  'ride-covers',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Ride covers are public" on storage.objects;
drop policy if exists "Users can upload ride covers" on storage.objects;
drop policy if exists "Users can update ride covers" on storage.objects;
drop policy if exists "Users can delete ride covers" on storage.objects;

create policy "Ride covers are public"
on storage.objects
for select
to public
using (bucket_id = 'ride-covers');

create policy "Users can upload ride covers"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ride-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update ride covers"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ride-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'ride-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete ride covers"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ride-covers'
  and auth.uid()::text = (storage.foldername(name))[1]
);
