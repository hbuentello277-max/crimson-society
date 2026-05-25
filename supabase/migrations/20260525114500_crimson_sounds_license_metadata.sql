alter table public.sounds add column if not exists mood text;
alter table public.sounds add column if not exists bpm integer;
alter table public.sounds add column if not exists rights_owner text;
alter table public.sounds add column if not exists source_url text;

create index if not exists sounds_mood_idx
  on public.sounds (mood)
  where approved = true and disabled_at is null;

create index if not exists sounds_bpm_idx
  on public.sounds (bpm)
  where approved = true and disabled_at is null;

insert into public.sound_categories (name, slug, sort_order)
values
  ('Hip Hop', 'hip-hop', 50),
  ('Trap', 'trap', 60),
  ('Dark Trap', 'dark-trap', 70),
  ('Phonk', 'phonk', 80),
  ('Drift Phonk', 'drift-phonk', 90),
  ('Hype', 'hype', 100),
  ('Bass Heavy', 'bass-heavy', 110),
  ('Midnight Run', 'midnight-run', 120),
  ('Tunnel Echo', 'tunnel-echo', 130),
  ('City Lights', 'city-lights', 140),
  ('Ambient', 'ambient', 150),
  ('Chill Cruise', 'chill-cruise', 160),
  ('Bike Meet', 'bike-meet', 170),
  ('Synthwave', 'synthwave', 180),
  ('Lo-Fi', 'lo-fi', 190),
  ('Latin Trap', 'latin-trap', 200)
on conflict (slug) do nothing;
