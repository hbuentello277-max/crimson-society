-- Nexus Mark I: platform owner authorization foundation.

alter table public.profiles
  add column if not exists is_platform_owner boolean not null default false;

create or replace function public.is_platform_owner(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and is_platform_owner = true
      and status = 'active'
  )
  or exists (
    select 1
    from public.platform_settings ps
    where ps.key = 'nexus_owner_user_ids'
      and ps.value->'user_ids' @> to_jsonb(target_user_id::text)
  );
$$;

insert into public.platform_settings (key, value)
values ('nexus_owner_user_ids', jsonb_build_object('user_ids', jsonb_build_array()))
on conflict (key) do nothing;

create or replace function public.prevent_profile_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deletion_override text := current_setting('app.account_deletion_status_override', true);
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role = coalesce(new.role, 'user');
    new.status = coalesce(new.status, 'active');
    new.is_admin = coalesce(new.is_admin, false);
    new.is_platform_owner = coalesce(new.is_platform_owner, false);
    new.membership_status = coalesce(new.membership_status, 'inactive');

    if new.role <> 'user'
      or new.status <> 'active'
      or new.is_admin <> false
      or new.is_platform_owner <> false
    then
      raise exception 'Profile role, status, and admin flags can only be set by admin controls.';
    end if;

    return new;
  end if;

  if auth.uid() = old.id then
    if deletion_override = 'request'
      and new.status = 'deletion_pending'
      and old.status not in ('deletion_pending', 'deleted')
      and new.role is not distinct from old.role
      and new.is_admin is not distinct from old.is_admin
      and new.is_platform_owner is not distinct from old.is_platform_owner
      and new.membership_status is not distinct from old.membership_status
      and new.membership_tier is not distinct from old.membership_tier
    then
      return new;
    end if;

    if deletion_override = 'cancel'
      and old.status = 'deletion_pending'
      and new.status not in ('deletion_pending', 'deleted')
      and new.role is not distinct from old.role
      and new.is_admin is not distinct from old.is_admin
      and new.is_platform_owner is not distinct from old.is_platform_owner
      and new.membership_status is not distinct from old.membership_status
      and new.membership_tier is not distinct from old.membership_tier
    then
      return new;
    end if;

    if new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.is_admin is distinct from old.is_admin
      or new.is_platform_owner is distinct from old.is_platform_owner
      or new.membership_status is distinct from old.membership_status
      or new.membership_tier is distinct from old.membership_tier
    then
      raise exception 'Profile privileged fields can only be changed by admin controls.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.is_platform_owner(uuid) from public;
grant execute on function public.is_platform_owner(uuid) to authenticated;
grant execute on function public.is_platform_owner(uuid) to service_role;
