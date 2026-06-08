-- Reel playback metadata for beta limits and display (duration surfaced in UI/moderation).
alter table public."Posts"
  add column if not exists video_duration_seconds integer,
  add column if not exists video_width integer,
  add column if not exists video_height integer;

comment on column public."Posts".video_duration_seconds is 'Processed reel duration in whole seconds.';
comment on column public."Posts".video_width is 'Processed reel width in pixels.';
comment on column public."Posts".video_height is 'Processed reel height in pixels.';
