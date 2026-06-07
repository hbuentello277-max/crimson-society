-- Phase 21: Nexus Operator low-risk execution records.

create table if not exists public.nexus_operator_executions (
  id uuid primary key default gen_random_uuid(),
  automation_action_id uuid not null references public.nexus_automation_actions(id) on delete cascade,
  execution_type text not null check (
    execution_type in (
      'refresh_health',
      'refresh_metrics',
      'refresh_mission',
      'refresh_intelligence',
      'refresh_correlations',
      'refresh_reports',
      'refresh_briefings',
      'refresh_memory',
      'refresh_planning',
      'operational_snapshot'
    )
  ),
  status text not null default 'queued' check (
    status in ('queued', 'running', 'completed', 'failed', 'cancelled')
  ),
  started_at timestamptz,
  completed_at timestamptz,
  executed_by uuid references auth.users(id) on delete set null,
  result jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nexus_operator_executions_automation_idx
  on public.nexus_operator_executions (automation_action_id, created_at desc);

create index if not exists nexus_operator_executions_status_created_idx
  on public.nexus_operator_executions (status, created_at desc);

create index if not exists nexus_operator_executions_type_created_idx
  on public.nexus_operator_executions (execution_type, created_at desc);

alter table public.nexus_operator_executions enable row level security;

revoke all on table public.nexus_operator_executions from anon;
revoke all on table public.nexus_operator_executions from authenticated;
grant all on table public.nexus_operator_executions to service_role;
grant select, insert, update on table public.nexus_operator_executions to authenticated;

drop policy if exists "Nexus owner reads operator executions" on public.nexus_operator_executions;
create policy "Nexus owner reads operator executions"
on public.nexus_operator_executions for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner inserts operator executions" on public.nexus_operator_executions;
create policy "Nexus owner inserts operator executions"
on public.nexus_operator_executions for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates operator executions" on public.nexus_operator_executions;
create policy "Nexus owner updates operator executions"
on public.nexus_operator_executions for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));
