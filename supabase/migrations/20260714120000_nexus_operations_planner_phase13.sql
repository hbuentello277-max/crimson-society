-- Phase 13: NEXUS Operations Planner — draft plans only (no autonomous execution).

create table if not exists public.nexus_operations_plans (
  id uuid primary key default gen_random_uuid(),
  plan_type text not null check (
    plan_type in ('growth', 'revenue', 'membership', 'launch', 'incident')
  ),
  title text not null,
  objective text not null,
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  confidence_score integer not null check (confidence_score between 0 and 100),
  estimated_impact_score integer not null check (estimated_impact_score between 0 and 100),
  reason text not null,
  steps jsonb not null default '[]'::jsonb,
  related_risks jsonb not null default '[]'::jsonb,
  related_opportunities jsonb not null default '[]'::jsonb,
  suggested_action_drafts jsonb not null default '[]'::jsonb,
  status text not null default 'pending_approval' check (
    status in ('draft', 'pending_approval', 'review_required')
  ),
  created_by_label text not null default 'NEXUS',
  created_by_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_operations_plans_created_idx
  on public.nexus_operations_plans (created_at desc);

create index if not exists nexus_operations_plans_type_created_idx
  on public.nexus_operations_plans (plan_type, created_at desc);

create index if not exists nexus_operations_plans_status_created_idx
  on public.nexus_operations_plans (status, created_at desc);

alter table public.nexus_operations_plans enable row level security;

revoke all on table public.nexus_operations_plans from anon;
revoke all on table public.nexus_operations_plans from authenticated;
grant all on table public.nexus_operations_plans to service_role;
grant select, insert, update on table public.nexus_operations_plans to authenticated;

drop policy if exists "Nexus owner reads operations plans" on public.nexus_operations_plans;
create policy "Nexus owner reads operations plans"
on public.nexus_operations_plans for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner inserts operations plans" on public.nexus_operations_plans;
create policy "Nexus owner inserts operations plans"
on public.nexus_operations_plans for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates operations plans" on public.nexus_operations_plans;
create policy "Nexus owner updates operations plans"
on public.nexus_operations_plans for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));
