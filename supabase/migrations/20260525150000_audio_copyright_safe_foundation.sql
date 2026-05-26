create extension if not exists pgcrypto;

alter table public.sounds add column if not exists approved_source boolean not null default false;
alter table public.sounds add column if not exists copyright_status text not null default 'needs_review';
alter table public.sounds add column if not exists moderation_status text not null default 'pending';
alter table public.sounds add column if not exists file_size_bytes bigint;
alter table public.sounds add column if not exists mime_type text;
alter table public.sounds add column if not exists original_bucket text;
alter table public.sounds add column if not exists original_path text;
alter table public.sounds add column if not exists render_bucket text;
alter table public.sounds add column if not exists render_path text;
alter table public.sounds add column if not exists imported_from text;
alter table public.sounds add column if not exists import_source_name text;
alter table public.sounds add column if not exists rejected_at timestamptz;
alter table public.sounds add column if not exists rejection_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sounds_duration_limit_check'
      and conrelid = 'public.sounds'::regclass
  ) then
    alter table public.sounds
      add constraint sounds_duration_limit_check
      check (duration_seconds is null or duration_seconds between 1 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sounds_file_size_limit_check'
      and conrelid = 'public.sounds'::regclass
  ) then
    alter table public.sounds
      add constraint sounds_file_size_limit_check
      check (file_size_bytes is null or file_size_bytes <= 52428800);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sounds_copyright_status_check'
      and conrelid = 'public.sounds'::regclass
  ) then
    alter table public.sounds
      add constraint sounds_copyright_status_check
      check (copyright_status in ('needs_review', 'verified', 'rejected', 'expired'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'sounds_moderation_status_check'
      and conrelid = 'public.sounds'::regclass
  ) then
    alter table public.sounds
      add constraint sounds_moderation_status_check
      check (moderation_status in ('draft', 'pending', 'approved', 'rejected', 'disabled'));
  end if;
end;
$$;

create table if not exists public.audio_import_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  source_url text,
  license_type text not null default 'royalty_free',
  notes text,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.audio_import_sources add column if not exists name text;
alter table public.audio_import_sources add column if not exists slug text;
alter table public.audio_import_sources add column if not exists source_url text;
alter table public.audio_import_sources add column if not exists license_type text not null default 'royalty_free';
alter table public.audio_import_sources add column if not exists notes text;
alter table public.audio_import_sources add column if not exists approved boolean not null default true;
alter table public.audio_import_sources add column if not exists created_at timestamptz not null default now();
alter table public.audio_import_sources add column if not exists updated_at timestamptz not null default now();

create table if not exists public.audio_tracks (
  id uuid primary key default gen_random_uuid(),
  sound_id uuid references public.sounds(id) on delete set null,
  title text not null,
  artist text,
  duration_seconds integer,
  category_id uuid references public.sound_categories(id) on delete set null,
  mood text,
  bpm integer,
  original_bucket text,
  original_path text,
  render_bucket text,
  render_path text,
  public_stream_url text,
  preview_url text,
  cover_image_url text,
  file_size_bytes bigint,
  mime_type text,
  codec text,
  bitrate_kbps integer,
  waveform jsonb,
  provider text not null default 'internal',
  import_source_id uuid references public.audio_import_sources(id) on delete set null,
  import_source_name text,
  source_url text,
  license_type text not null default 'royalty_free',
  license_notes text,
  rights_owner text,
  rights_expires_at timestamptz,
  approved_source boolean not null default false,
  copyright_status text not null default 'needs_review',
  approved boolean not null default false,
  moderation_status text not null default 'pending',
  rejection_reason text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.audio_tracks add column if not exists sound_id uuid references public.sounds(id) on delete set null;
alter table public.audio_tracks add column if not exists title text;
alter table public.audio_tracks add column if not exists artist text;
alter table public.audio_tracks add column if not exists duration_seconds integer;
alter table public.audio_tracks add column if not exists category_id uuid references public.sound_categories(id) on delete set null;
alter table public.audio_tracks add column if not exists mood text;
alter table public.audio_tracks add column if not exists bpm integer;
alter table public.audio_tracks add column if not exists original_bucket text;
alter table public.audio_tracks add column if not exists original_path text;
alter table public.audio_tracks add column if not exists render_bucket text;
alter table public.audio_tracks add column if not exists render_path text;
alter table public.audio_tracks add column if not exists public_stream_url text;
alter table public.audio_tracks add column if not exists preview_url text;
alter table public.audio_tracks add column if not exists cover_image_url text;
alter table public.audio_tracks add column if not exists file_size_bytes bigint;
alter table public.audio_tracks add column if not exists mime_type text;
alter table public.audio_tracks add column if not exists codec text;
alter table public.audio_tracks add column if not exists bitrate_kbps integer;
alter table public.audio_tracks add column if not exists waveform jsonb;
alter table public.audio_tracks add column if not exists provider text not null default 'internal';
alter table public.audio_tracks add column if not exists import_source_id uuid references public.audio_import_sources(id) on delete set null;
alter table public.audio_tracks add column if not exists import_source_name text;
alter table public.audio_tracks add column if not exists source_url text;
alter table public.audio_tracks add column if not exists license_type text not null default 'royalty_free';
alter table public.audio_tracks add column if not exists license_notes text;
alter table public.audio_tracks add column if not exists rights_owner text;
alter table public.audio_tracks add column if not exists rights_expires_at timestamptz;
alter table public.audio_tracks add column if not exists approved_source boolean not null default false;
alter table public.audio_tracks add column if not exists copyright_status text not null default 'needs_review';
alter table public.audio_tracks add column if not exists approved boolean not null default false;
alter table public.audio_tracks add column if not exists moderation_status text not null default 'pending';
alter table public.audio_tracks add column if not exists rejection_reason text;
alter table public.audio_tracks add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.audio_tracks add column if not exists created_at timestamptz not null default now();
alter table public.audio_tracks add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audio_tracks_sound_id_key'
      and conrelid = 'public.audio_tracks'::regclass
  ) then
    alter table public.audio_tracks
      add constraint audio_tracks_sound_id_key unique (sound_id);
  end if;
end;
$$;

create index if not exists audio_tracks_approved_featured_idx
  on public.audio_tracks (approved, moderation_status, created_at desc)
  where approved = true and moderation_status = 'approved';

create index if not exists audio_tracks_category_idx
  on public.audio_tracks (category_id, created_at desc);

create index if not exists audio_tracks_copyright_status_idx
  on public.audio_tracks (copyright_status, moderation_status);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audio_tracks_duration_limit_check'
      and conrelid = 'public.audio_tracks'::regclass
  ) then
    alter table public.audio_tracks
      add constraint audio_tracks_duration_limit_check
      check (duration_seconds is null or duration_seconds between 1 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'audio_tracks_file_size_limit_check'
      and conrelid = 'public.audio_tracks'::regclass
  ) then
    alter table public.audio_tracks
      add constraint audio_tracks_file_size_limit_check
      check (file_size_bytes is null or file_size_bytes <= 52428800);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'audio_tracks_mime_type_check'
      and conrelid = 'public.audio_tracks'::regclass
  ) then
    alter table public.audio_tracks
      add constraint audio_tracks_mime_type_check
      check (
        mime_type is null or mime_type in (
          'audio/mpeg',
          'audio/mp3',
          'audio/mp4',
          'audio/aac',
          'audio/x-m4a',
          'audio/m4a',
          'audio/wav',
          'audio/x-wav'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'audio_tracks_copyright_status_check'
      and conrelid = 'public.audio_tracks'::regclass
  ) then
    alter table public.audio_tracks
      add constraint audio_tracks_copyright_status_check
      check (copyright_status in ('needs_review', 'verified', 'rejected', 'expired'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'audio_tracks_moderation_status_check'
      and conrelid = 'public.audio_tracks'::regclass
  ) then
    alter table public.audio_tracks
      add constraint audio_tracks_moderation_status_check
      check (moderation_status in ('draft', 'pending', 'approved', 'rejected', 'disabled'));
  end if;
end;
$$;

drop trigger if exists touch_audio_import_sources_updated_at on public.audio_import_sources;
create trigger touch_audio_import_sources_updated_at
before update on public.audio_import_sources
for each row execute function public.touch_updated_at();

drop trigger if exists touch_audio_tracks_updated_at on public.audio_tracks;
create trigger touch_audio_tracks_updated_at
before update on public.audio_tracks
for each row execute function public.touch_updated_at();

create or replace function public.sync_audio_track_from_sound()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audio_tracks (
    sound_id,
    title,
    artist,
    duration_seconds,
    category_id,
    mood,
    bpm,
    original_bucket,
    original_path,
    render_bucket,
    render_path,
    public_stream_url,
    preview_url,
    cover_image_url,
    file_size_bytes,
    mime_type,
    provider,
    import_source_name,
    source_url,
    license_type,
    license_notes,
    rights_owner,
    rights_expires_at,
    approved_source,
    copyright_status,
    approved,
    moderation_status,
    rejection_reason,
    uploaded_by
  )
  values (
    new.id,
    new.title,
    new.artist,
    new.duration_seconds,
    new.category_id,
    new.mood,
    new.bpm,
    new.original_bucket,
    new.original_path,
    new.render_bucket,
    new.render_path,
    new.audio_url,
    new.preview_url,
    new.cover_image_url,
    new.file_size_bytes,
    new.mime_type,
    new.provider,
    new.import_source_name,
    new.source_url,
    new.license_type,
    new.license_notes,
    new.rights_owner,
    new.rights_expires_at,
    new.approved_source,
    new.copyright_status,
    new.approved,
    new.moderation_status,
    new.rejection_reason,
    new.uploaded_by
  )
  on conflict (sound_id) do update
  set title = excluded.title,
      artist = excluded.artist,
      duration_seconds = excluded.duration_seconds,
      category_id = excluded.category_id,
      mood = excluded.mood,
      bpm = excluded.bpm,
      original_bucket = excluded.original_bucket,
      original_path = excluded.original_path,
      render_bucket = excluded.render_bucket,
      render_path = excluded.render_path,
      public_stream_url = excluded.public_stream_url,
      preview_url = excluded.preview_url,
      cover_image_url = excluded.cover_image_url,
      file_size_bytes = excluded.file_size_bytes,
      mime_type = excluded.mime_type,
      provider = excluded.provider,
      import_source_name = excluded.import_source_name,
      source_url = excluded.source_url,
      license_type = excluded.license_type,
      license_notes = excluded.license_notes,
      rights_owner = excluded.rights_owner,
      rights_expires_at = excluded.rights_expires_at,
      approved_source = excluded.approved_source,
      copyright_status = excluded.copyright_status,
      approved = excluded.approved,
      moderation_status = excluded.moderation_status,
      rejection_reason = excluded.rejection_reason,
      uploaded_by = excluded.uploaded_by,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_audio_track_from_sound_after_write on public.sounds;
create trigger sync_audio_track_from_sound_after_write
after insert or update on public.sounds
for each row execute function public.sync_audio_track_from_sound();

insert into public.sound_categories (name, slug, sort_order)
values
  ('Hip Hop', 'hip-hop', 50),
  ('Dark Trap', 'dark-trap', 70),
  ('Cinematic', 'cinematic', 30),
  ('Phonk', 'phonk', 80),
  ('Night Ride', 'night-ride', 20),
  ('Chill Ride', 'chill-ride', 165),
  ('Highway', 'highway', 175),
  ('Aggressive', 'aggressive', 185),
  ('Emotional', 'emotional', 195),
  ('Luxury', 'luxury', 205),
  ('Ambient', 'ambient', 150)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

insert into public.audio_import_sources (name, slug, source_url, license_type, notes, approved)
values
  ('Crimson Society Internal', 'crimson-society-internal', null, 'app_owned', 'App-owned or commissioned audio only.', true),
  ('Royalty Free Commercial License', 'royalty-free-commercial-license', null, 'royalty_free', 'Admin must store receipt/license URL in source_url before approval.', true),
  ('CC0 Public Domain', 'cc0-public-domain', null, 'cc0', 'Verify the source page explicitly allows commercial reuse.', true)
on conflict (slug) do update
set source_url = excluded.source_url,
    license_type = excluded.license_type,
    notes = excluded.notes,
    approved = excluded.approved;

insert into public.sounds (
  title,
  artist,
  description,
  duration_seconds,
  mood,
  bpm,
  category_id,
  provider,
  license_type,
  license_notes,
  rights_owner,
  source_url,
  approved_source,
  copyright_status,
  moderation_status,
  approved,
  featured
)
select
  seed.title,
  'Crimson Society',
  seed.description,
  seed.duration_seconds,
  seed.mood,
  seed.bpm,
  categories.id,
  'internal',
  'app_owned',
  'Placeholder only. Upload verified audio before approval.',
  'Crimson Society',
  null,
  false,
  'needs_review',
  'pending',
  false,
  seed.featured
from (
  values
    ('Midnight Run Placeholder', 'Placeholder metadata for a future royalty-free night ride track.', 60, 'night ride', 92, 'night-ride', true),
    ('Tunnel Echo Placeholder', 'Placeholder metadata for a future cinematic highway track.', 45, 'cinematic', 78, 'cinematic', false),
    ('Redline Calm Placeholder', 'Placeholder metadata for a future chill ride track.', 50, 'chill ride', 84, 'chill-ride', false)
) as seed(title, description, duration_seconds, mood, bpm, category_slug, featured)
left join public.sound_categories categories on categories.slug = seed.category_slug
where not exists (
  select 1
  from public.sounds existing
  where existing.title = seed.title
    and coalesce(existing.artist, '') = 'Crimson Society'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('sound-originals', 'sound-originals', false, 52428800, array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a', 'audio/wav', 'audio/x-wav']),
  ('sound-renders', 'sound-renders', true, 52428800, array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.audio_import_sources enable row level security;
alter table public.audio_tracks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audio_import_sources' and policyname = 'Approved audio import sources are readable') then
    create policy "Approved audio import sources are readable"
    on public.audio_import_sources
    for select
    using (approved = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audio_import_sources' and policyname = 'Admins can manage audio import sources') then
    create policy "Admins can manage audio import sources"
    on public.audio_import_sources
    for all
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    )
    with check (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audio_tracks' and policyname = 'Approved audio tracks are readable') then
    create policy "Approved audio tracks are readable"
    on public.audio_tracks
    for select
    using (
      approved = true
      and moderation_status = 'approved'
      and copyright_status = 'verified'
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'audio_tracks' and policyname = 'Admins can manage audio tracks') then
    create policy "Admins can manage audio tracks"
    on public.audio_tracks
    for all
    using (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    )
    with check (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins can read sound originals') then
    create policy "Admins can read sound originals"
    on storage.objects
    for select
    using (
      bucket_id = 'sound-originals'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins can update sound originals') then
    create policy "Admins can update sound originals"
    on storage.objects
    for update
    using (
      bucket_id = 'sound-originals'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    )
    with check (
      bucket_id = 'sound-originals'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Admins can delete sound originals') then
    create policy "Admins can delete sound originals"
    on storage.objects
    for delete
    using (
      bucket_id = 'sound-originals'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;
end;
$$;
