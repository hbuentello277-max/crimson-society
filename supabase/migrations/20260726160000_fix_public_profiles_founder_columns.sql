-- Fix public_profiles view recreation from 20260726150000_founder_blackcard_badge.sql.
-- PostgreSQL CREATE OR REPLACE VIEW cannot insert columns before existing ones;
-- adding is_founder_blackcard before is_founding_blackcard is treated as a rename.

alter table public.profiles
  add column if not exists is_founder_blackcard boolean not null default false;

alter table public.profiles
  add column if not exists founder_blackcard_granted_at timestamptz;

drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = false) as
select
  id,
  username,
  display_name,
  full_name,
  avatar_url,
  profile_image_url,
  bio,
  case when hide_location_from_suggestions then null else location end as location,
  case when hide_location_from_suggestions then null else city end as city,
  case when hide_location_from_suggestions then null else state end as state,
  riding_area,
  bike_type,
  riding_style,
  profile_tags,
  hide_location_from_suggestions,
  hide_from_suggestions,
  quote,
  instagram_url,
  tiktok_url,
  youtube_url,
  website_url,
  blackcard_public,
  is_founder_blackcard,
  is_founding_blackcard,
  founding_blackcard_granted_at,
  membership_tier
from public.profiles
where status = 'active';

grant select on public.public_profiles to anon;
grant select on public.public_profiles to authenticated;

notify pgrst, 'reload schema';
