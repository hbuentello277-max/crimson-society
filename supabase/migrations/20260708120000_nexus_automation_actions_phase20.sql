-- Phase 20: Controlled automation actions (approval-only, no execution).

create table if not exists public.nexus_automation_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (
    action_type in (
      'reporting',
      'monitoring',
      'maintenance',
      'growth',
      'engagement',
      'operations'
    )
  ),
  title text not null,
  summary text not null,
  recommendation text not null,
  source text not null,
  status text not null default 'proposed' check (
    status in ('proposed', 'approved', 'rejected', 'archived')
  ),
  approval_required boolean not null default true,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists nexus_automation_actions_status_created_idx
  on public.nexus_automation_actions (status, created_at desc);

create index if not exists nexus_automation_actions_type_created_idx
  on public.nexus_automation_actions (action_type, created_at desc);

create index if not exists nexus_automation_actions_source_created_idx
  on public.nexus_automation_actions (source, created_at desc);

create index if not exists nexus_automation_actions_metadata_dedupe_idx
  on public.nexus_automation_actions ((metadata->>'dedupe_key'))
  where metadata ? 'dedupe_key';

alter table public.nexus_automation_actions enable row level security;

revoke all on table public.nexus_automation_actions from anon;
revoke all on table public.nexus_automation_actions from authenticated;
grant all on table public.nexus_automation_actions to service_role;
grant select, insert, update on table public.nexus_automation_actions to authenticated;

drop policy if exists "Nexus owner reads automation actions" on public.nexus_automation_actions;
create policy "Nexus owner reads automation actions"
on public.nexus_automation_actions for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner inserts automation actions" on public.nexus_automation_actions;
create policy "Nexus owner inserts automation actions"
on public.nexus_automation_actions for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates automation actions" on public.nexus_automation_actions;
create policy "Nexus owner updates automation actions"
on public.nexus_automation_actions for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));
