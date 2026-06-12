-- Fix public_profiles view recreation from 20260726150000_founder_blackcard_badge.sql.
-- PostgreSQL CREATE OR REPLACE VIEW cannot insert columns before existing ones;
-- adding is_founder_blackcard before is_founding_blackcard is treated as a rename.
--
-- Apply after marking 20260726150000 as applied:
--   supabase migration repair --status applied 20260726150000

alter table public.profiles
  add column if not exists is_founder_blackcard boolean not null default false;

alter table public.profiles
  add column if not exists founder_blackcard_granted_at timestamptz;

alter table public.profiles drop constraint if exists profiles_membership_tier_check;
alter table public.profiles add constraint profiles_membership_tier_check
  check (membership_tier in ('free', 'blackcard', 'founding', 'founder'));

alter table public.profiles drop constraint if exists profiles_founder_blackcard_owner_only;
alter table public.profiles add constraint profiles_founder_blackcard_owner_only
  check (is_founder_blackcard = false or is_platform_owner = true);

create or replace function public.resolve_profile_membership_tier(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_active_user(target_user_id) then 'free'
    when exists (
      select 1
      from public.profiles p
      where p.id = target_user_id
        and p.is_founder_blackcard = true
    ) then 'founder'
    when exists (
      select 1
      from public.profiles p
      where p.id = target_user_id
        and p.is_founding_blackcard = true
    ) then 'founding'
    when public.is_profile_admin(target_user_id)
      or public.profile_has_admin_blackcard_override(target_user_id)
      or exists (
        select 1
        from public.subscriptions s
        where s.user_id = target_user_id
          and s.status in ('active', 'trialing')
          and (s.current_period_end is null or s.current_period_end >= now())
      ) then 'blackcard'
    else 'free'
  end;
$$;

create or replace function public.user_has_blackcard_access(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_active_user(coalesce(target_user_id, auth.uid()))
    and (
      public.is_profile_admin(coalesce(target_user_id, auth.uid()))
      or exists (
        select 1
        from public.profiles p
        where p.id = coalesce(target_user_id, auth.uid())
          and (
            p.is_founder_blackcard = true
            or p.is_founding_blackcard = true
          )
      )
      or public.profile_has_admin_blackcard_override(coalesce(target_user_id, auth.uid()))
      or exists (
        select 1
        from public.subscriptions s
        where s.user_id = coalesce(target_user_id, auth.uid())
          and s.status in ('active', 'trialing')
          and (s.current_period_end is null or s.current_period_end >= now())
      )
    );
$$;

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

update public.profiles p
set membership_tier = public.resolve_profile_membership_tier(p.id)
where p.membership_tier is distinct from public.resolve_profile_membership_tier(p.id);

update public.profiles p
set blackcard_public = public.user_has_blackcard_access(p.id)
where p.blackcard_public is distinct from public.user_has_blackcard_access(p.id);

grant execute on function public.resolve_profile_membership_tier(uuid) to authenticated;
grant execute on function public.user_has_blackcard_access(uuid) to authenticated;

notify pgrst, 'reload schema';
