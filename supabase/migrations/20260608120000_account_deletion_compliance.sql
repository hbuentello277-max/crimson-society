-- Account deletion compliance: profile statuses, audit trail, moderation FK retention.

-- ---------------------------------------------------------------------------
-- Profile status: add deletion_pending and deleted
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'limited', 'suspended', 'blocked', 'deletion_pending', 'deleted'));

create or replace function public.admin_update_profile_access(
  target_user_id uuid,
  new_role text,
  new_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_profile public.profiles;
  updated_profile public.profiles;
begin
  if new_role not in ('user', 'moderator', 'admin') then
    raise exception 'Invalid role.';
  end if;

  if new_status not in ('active', 'limited', 'suspended', 'blocked', 'deletion_pending', 'deleted') then
    raise exception 'Invalid status.';
  end if;

  select *
  into caller_profile
  from public.profiles
  where id = auth.uid();

  if caller_profile.role <> 'admin' or caller_profile.status <> 'active' then
    raise exception 'Admins only.';
  end if;

  update public.profiles
  set role = new_role,
      status = new_status
  where id = target_user_id
  returning * into updated_profile;

  return updated_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deletion requests: audit columns
-- ---------------------------------------------------------------------------
alter table public.account_deletion_requests
  add column if not exists signed_out_at timestamptz,
  add column if not exists previous_status text,
  add column if not exists completion_log jsonb,
  add column if not exists completed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Immutable audit log (survives auth user deletion)
-- ---------------------------------------------------------------------------
create table if not exists public.account_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  deletion_request_id uuid,
  admin_id uuid,
  username_snapshot text,
  email_hash text,
  requested_at timestamptz,
  completed_at timestamptz not null default now(),
  stripe_customer_id text,
  completion_log jsonb not null default '{}'::jsonb
);

create index if not exists account_deletion_audit_user_id_idx
  on public.account_deletion_audit (user_id, completed_at desc);

alter table public.account_deletion_audit enable row level security;

drop policy if exists "Admins can read deletion audit" on public.account_deletion_audit;
create policy "Admins can read deletion audit"
on public.account_deletion_audit
for select
to authenticated
using (public.is_profile_admin(auth.uid()));

grant select on public.account_deletion_audit to authenticated;
grant all on public.account_deletion_audit to service_role;

-- ---------------------------------------------------------------------------
-- Moderation retention: reporter survives auth delete
-- ---------------------------------------------------------------------------
alter table public.user_reports
  add column if not exists reporter_snapshot jsonb;

alter table public.user_reports drop constraint if exists user_reports_reporter_id_fkey;

alter table public.user_reports
  add constraint user_reports_reporter_id_fkey
  foreign key (reporter_id)
  references auth.users(id)
  on delete set null;

alter table public.account_deletion_requests drop constraint if exists account_deletion_requests_user_id_fkey;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;
