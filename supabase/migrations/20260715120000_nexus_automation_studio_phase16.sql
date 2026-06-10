-- Phase 16: Founder Automation Studio (rules monitor conditions, prepare drafts only).

create table if not exists public.nexus_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null check (
    category in ('growth', 'launch', 'shop', 'community', 'platform_risk', 'custom')
  ),
  condition_type text not null check (
    condition_type in (
      'blackcard_conversion_drop',
      'launch_readiness_below',
      'shop_inventory_low',
      'signup_increase_percent',
      'platform_health_degraded'
    )
  ),
  condition_config jsonb not null default '{}'::jsonb,
  output_type text not null default 'bundle' check (
    output_type in ('bundle', 'action_draft', 'operations_plan', 'briefing', 'report', 'recommendation')
  ),
  output_config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (
    status in ('draft', 'active', 'paused', 'disabled')
  ),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_checked_at timestamptz,
  last_triggered_at timestamptz
);

create index if not exists nexus_automation_rules_status_updated_idx
  on public.nexus_automation_rules (status, updated_at desc);

create index if not exists nexus_automation_rules_category_idx
  on public.nexus_automation_rules (category, created_at desc);

create table if not exists public.nexus_automation_triggers (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.nexus_automation_rules(id) on delete cascade,
  trigger_reason text not null,
  trigger_snapshot jsonb not null default '{}'::jsonb,
  generated_action_id uuid references public.nexus_action_cards(id) on delete set null,
  generated_plan_id uuid references public.nexus_operations_plans(id) on delete set null,
  status text not null default 'needs_approval' check (
    status in ('triggered', 'needs_approval', 'dismissed', 'approved')
  ),
  created_at timestamptz not null default now()
);

create index if not exists nexus_automation_triggers_rule_created_idx
  on public.nexus_automation_triggers (rule_id, created_at desc);

create index if not exists nexus_automation_triggers_status_created_idx
  on public.nexus_automation_triggers (status, created_at desc);

create table if not exists public.nexus_automation_history (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.nexus_automation_rules(id) on delete set null,
  trigger_id uuid references public.nexus_automation_triggers(id) on delete set null,
  event_type text not null check (
    event_type in (
      'rule_created',
      'rule_updated',
      'rule_enabled',
      'rule_paused',
      'rule_disabled',
      'rule_evaluated',
      'rule_triggered',
      'trigger_dismissed',
      'trigger_approved'
    )
  ),
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists nexus_automation_history_created_idx
  on public.nexus_automation_history (created_at desc);

alter table public.nexus_automation_rules enable row level security;
alter table public.nexus_automation_triggers enable row level security;
alter table public.nexus_automation_history enable row level security;

revoke all on table public.nexus_automation_rules from anon;
revoke all on table public.nexus_automation_triggers from anon;
revoke all on table public.nexus_automation_history from anon;

grant select, insert, update on table public.nexus_automation_rules to authenticated;
grant select, insert, update on table public.nexus_automation_triggers to authenticated;
grant select, insert on table public.nexus_automation_history to authenticated;
grant all on table public.nexus_automation_rules to service_role;
grant all on table public.nexus_automation_triggers to service_role;
grant all on table public.nexus_automation_history to service_role;

drop policy if exists "Nexus owner reads automation rules" on public.nexus_automation_rules;
create policy "Nexus owner reads automation rules"
on public.nexus_automation_rules for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner writes automation rules" on public.nexus_automation_rules;
create policy "Nexus owner writes automation rules"
on public.nexus_automation_rules for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates automation rules" on public.nexus_automation_rules;
create policy "Nexus owner updates automation rules"
on public.nexus_automation_rules for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads automation triggers" on public.nexus_automation_triggers;
create policy "Nexus owner reads automation triggers"
on public.nexus_automation_triggers for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner writes automation triggers" on public.nexus_automation_triggers;
create policy "Nexus owner writes automation triggers"
on public.nexus_automation_triggers for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates automation triggers" on public.nexus_automation_triggers;
create policy "Nexus owner updates automation triggers"
on public.nexus_automation_triggers for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads automation history" on public.nexus_automation_history;
create policy "Nexus owner reads automation history"
on public.nexus_automation_history for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner writes automation history" on public.nexus_automation_history;
create policy "Nexus owner writes automation history"
on public.nexus_automation_history for insert to authenticated
with check (public.is_platform_owner(auth.uid()));
