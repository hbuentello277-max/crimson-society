-- Founding Blackcard as a first-class membership tier (free | blackcard | founding).

alter table public.profiles
  add column if not exists membership_tier text not null default 'free';

alter table public.profiles drop constraint if exists profiles_membership_tier_check;
alter table public.profiles add constraint profiles_membership_tier_check
  check (membership_tier in ('free', 'blackcard', 'founding'));

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value)
values ('founding_blackcard', jsonb_build_object('grants_open', true))
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

drop policy if exists "Admins manage platform settings" on public.platform_settings;
create policy "Admins manage platform settings"
on public.platform_settings for all to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "Anyone can read platform settings" on public.platform_settings;
create policy "Anyone can read platform settings"
on public.platform_settings for select to authenticated
using (true);

grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;

create or replace function public.founding_blackcard_grants_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value->>'grants_open')::boolean from public.platform_settings where key = 'founding_blackcard'),
    true
  );
$$;

revoke all on function public.founding_blackcard_grants_open() from public;
grant execute on function public.founding_blackcard_grants_open() to authenticated;

create or replace function public.resolve_profile_membership_tier(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.profiles p
      where p.id = target_user_id and p.is_founding_blackcard = true
    ) then 'founding'
    when public.profile_has_admin_blackcard_override(target_user_id)
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

revoke all on function public.resolve_profile_membership_tier(uuid) from public;
grant execute on function public.resolve_profile_membership_tier(uuid) to authenticated;

create or replace function public.sync_profile_membership_tier(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_tier text;
begin
  next_tier := public.resolve_profile_membership_tier(target_user_id);

  update public.profiles p
  set membership_tier = next_tier
  where p.id = target_user_id
    and p.membership_tier is distinct from next_tier;

  perform public.sync_profile_blackcard_public(target_user_id);
  return next_tier;
end;
$$;

revoke all on function public.sync_profile_membership_tier(uuid) from public;
grant execute on function public.sync_profile_membership_tier(uuid) to authenticated;

update public.profiles p
set membership_tier = public.resolve_profile_membership_tier(p.id)
where p.membership_tier is distinct from public.resolve_profile_membership_tier(p.id);

update public.profiles p
set blackcard_public = public.user_has_blackcard_access(p.id)
where p.blackcard_public is distinct from public.user_has_blackcard_access(p.id);

notify pgrst, 'reload schema';
