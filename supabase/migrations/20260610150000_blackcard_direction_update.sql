-- Blackcard product direction update:
-- Deprecate Favorite Rider Alerts + Priority Meet Access.
-- Add Founding Blackcard Member foundation.

drop trigger if exists create_favorite_rider_post_notification_after_insert on public."Posts";
drop trigger if exists create_favorite_rider_ride_started_after_update on public.rides;
drop trigger if exists create_favorite_rider_meet_notification_after_insert on public.rides;

drop function if exists public.create_favorite_rider_post_notification();
drop function if exists public.create_favorite_rider_ride_started_notification();
drop function if exists public.create_favorite_rider_meet_notification();
drop function if exists public.notify_favorite_riders(uuid, text, text, text, uuid, uuid, text);

create or replace function public.create_host_meet_subscriber_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_host_meet_subscribers(
    new.host_id,
    new.id,
    new.name,
    '/rides?meet=' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists create_host_meet_subscriber_notification_after_insert on public.rides;
create trigger create_host_meet_subscriber_notification_after_insert
after insert on public.rides
for each row
execute function public.create_host_meet_subscriber_notification();

update public.rides
set priority_access = 'off',
    priority_open_at = null
where priority_access is distinct from 'off'
   or priority_open_at is not null;

alter table public.profiles
  add column if not exists is_founding_blackcard boolean not null default false,
  add column if not exists founding_blackcard_granted_at timestamptz;

create index if not exists profiles_founding_blackcard_idx
  on public.profiles (is_founding_blackcard)
  where is_founding_blackcard = true;

create or replace function public.user_has_blackcard_access(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_profile_admin(coalesce(target_user_id, auth.uid()))
    or exists (
      select 1
      from public.profiles p
      where p.id = coalesce(target_user_id, auth.uid())
        and p.is_founding_blackcard = true
    )
    or public.profile_has_admin_blackcard_override(coalesce(target_user_id, auth.uid()))
    or exists (
      select 1
      from public.subscriptions s
      where s.user_id = coalesce(target_user_id, auth.uid())
        and s.status in ('active', 'trialing')
        and (s.current_period_end is null or s.current_period_end >= now())
    );
$$;

revoke all on function public.user_has_blackcard_access(uuid) from public;
grant execute on function public.user_has_blackcard_access(uuid) to authenticated;

update public.profiles p
set blackcard_public = public.user_has_blackcard_access(p.id)
where p.blackcard_public is distinct from public.user_has_blackcard_access(p.id);

notify pgrst, 'reload schema';
