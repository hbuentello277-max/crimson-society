alter table public.ride_messages
add column if not exists media_url text null;

alter table public.ride_messages
add column if not exists media_type text null;

alter table public.ride_messages
drop constraint if exists ride_messages_body_check;

alter table public.ride_messages
drop constraint if exists ride_messages_media_type_check;

alter table public.ride_messages
add constraint ride_messages_body_check
check (
  (
    char_length(trim(body)) > 0
    and char_length(body) <= 1000
  )
  or media_url is not null
);

alter table public.ride_messages
add constraint ride_messages_media_type_check
check (
  media_type is null
  or media_type like 'image/%'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ride-chat-media',
  'ride-chat-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Ride chat media is public" on storage.objects;
drop policy if exists "Users can upload ride chat media" on storage.objects;
drop policy if exists "Users can update ride chat media" on storage.objects;
drop policy if exists "Users can delete ride chat media" on storage.objects;

create policy "Ride chat media is public"
on storage.objects
for select
to public
using (bucket_id = 'ride-chat-media');

create policy "Users can upload ride chat media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ride-chat-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update ride chat media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ride-chat-media'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'ride-chat-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete ride chat media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ride-chat-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);
