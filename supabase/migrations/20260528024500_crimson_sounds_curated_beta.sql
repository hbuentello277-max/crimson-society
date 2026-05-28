alter table public.sounds
  add column if not exists tags text,
  add column if not exists trending boolean not null default false;

alter table public.audio_tracks
  add column if not exists tags text,
  add column if not exists trending boolean not null default false;
