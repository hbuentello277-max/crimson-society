alter table public.motorcycles
  add column if not exists photo_url text,
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'garage-bike-photos',
  'garage-bike-photos',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Garage bike photos are public" on storage.objects;
drop policy if exists "Users can upload their own garage bike photos" on storage.objects;
drop policy if exists "Users can update their own garage bike photos" on storage.objects;
drop policy if exists "Users can delete their own garage bike photos" on storage.objects;

create policy "Garage bike photos are public"
on storage.objects
for select
to public
using (bucket_id = 'garage-bike-photos');

create policy "Users can upload their own garage bike photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'garage-bike-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update their own garage bike photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'garage-bike-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'garage-bike-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own garage bike photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'garage-bike-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
