-- Nexus Mark I Revision B: observations, commands, war rooms, mission health.

create table if not exists public.nexus_war_rooms (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null unique references public.nexus_incidents(id) on delete cascade,
  title text not null,
  status text not null default 'active' check (
    status in ('active', 'stabilizing', 'resolved', 'archived')
  ),
  severity text not null check (severity in ('warning', 'critical')),
  impact_summary text,
  root_cause text,
  resolution_summary text,
  owner_notes text,
  timeline jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  activated_at timestamptz not null default now(),
  stabilized_at timestamptz,
  resolved_at timestamptz,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_war_rooms_status_idx
  on public.nexus_war_rooms (status, activated_at desc);

create table if not exists public.nexus_observations (
  id uuid primary key default gen_random_uuid(),
  observation_type text not null check (
    observation_type in ('trend', 'anomaly', 'correlation', 'regression', 'milestone', 'summary')
  ),
  category text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  title text not null,
  summary text not null,
  evidence jsonb not null default '{}'::jsonb,
  source text not null check (source in ('rule_engine', 'collector', 'manual', 'ai')),
  rule_id text,
  status text not null default 'active' check (
    status in ('active', 'superseded', 'dismissed', 'confirmed')
  ),
  dismissed_at timestamptz,
  dismissed_by uuid references public.profiles(id) on delete set null,
  superseded_by uuid references public.nexus_observations(id) on delete set null,
  incident_id uuid references public.nexus_incidents(id) on delete set null,
  war_room_id uuid references public.nexus_war_rooms(id) on delete set null,
  occurred_at timestamptz not null,
  valid_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_observations_status_severity_idx
  on public.nexus_observations (status, severity, occurred_at desc)
  where status = 'active';

create index if not exists nexus_observations_category_idx
  on public.nexus_observations (category, occurred_at desc);

create index if not exists nexus_observations_confidence_idx
  on public.nexus_observations (confidence desc)
  where status = 'active';

create index if not exists nexus_observations_incident_idx
  on public.nexus_observations (incident_id)
  where incident_id is not null;

create table if not exists public.nexus_observation_events (
  observation_id uuid not null references public.nexus_observations(id) on delete cascade,
  event_id uuid not null references public.nexus_events(id) on delete cascade,
  relevance text not null default 'supporting' check (relevance in ('primary', 'supporting')),
  primary key (observation_id, event_id)
);

create index if not exists nexus_observation_events_event_idx
  on public.nexus_observation_events (event_id);

create table if not exists public.nexus_observation_metrics (
  observation_id uuid not null references public.nexus_observations(id) on delete cascade,
  snapshot_id uuid not null references public.nexus_metrics_snapshots(id) on delete cascade,
  role text not null default 'comparison' check (role in ('baseline', 'current', 'comparison')),
  primary key (observation_id, snapshot_id)
);

create table if not exists public.nexus_observation_alerts (
  observation_id uuid not null references public.nexus_observations(id) on delete cascade,
  alert_id uuid not null references public.nexus_alerts(id) on delete cascade,
  relationship text not null default 'related' check (
    relationship in ('triggered_by', 'related', 'escalated_to')
  ),
  primary key (observation_id, alert_id)
);

create table if not exists public.nexus_commands (
  id uuid primary key default gen_random_uuid(),
  command_type text not null,
  title text not null,
  description text not null,
  status text not null default 'suggested' check (
    status in (
      'suggested',
      'pending_approval',
      'approved',
      'rejected',
      'completed',
      'expired',
      'dismissed',
      'executing',
      'executed',
      'failed'
    )
  ),
  origin text not null check (origin in ('owner', 'system', 'observation', 'alert', 'ai')),
  risk_level text not null default 'low' check (risk_level in ('none', 'low', 'medium', 'high')),
  approval_required boolean not null default true,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete set null,
  executed_at timestamptz,
  execution_result jsonb,
  observation_id uuid references public.nexus_observations(id) on delete set null,
  alert_id uuid references public.nexus_alerts(id) on delete set null,
  incident_id uuid references public.nexus_incidents(id) on delete set null,
  war_room_id uuid references public.nexus_war_rooms(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_commands_status_idx
  on public.nexus_commands (status, created_at desc);

create index if not exists nexus_commands_war_room_idx
  on public.nexus_commands (war_room_id)
  where war_room_id is not null;

create table if not exists public.nexus_mission_workflows (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  description text,
  category text not null,
  status text not null default 'unknown' check (
    status in ('healthy', 'degraded', 'failing', 'unknown')
  ),
  weight numeric(3, 2) not null default 1.0,
  last_check_at timestamptz,
  last_success_at timestamptz,
  failure_count_1h integer not null default 0,
  success_count_1h integer not null default 0,
  success_rate_1h numeric(5, 4),
  config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nexus_mission_checks (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.nexus_mission_workflows(id) on delete cascade,
  status text not null check (status in ('pass', 'warn', 'fail')),
  latency_ms integer,
  check_method text not null check (check_method in ('synthetic', 'db_signal', 'event_rate')),
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists nexus_mission_checks_workflow_checked_idx
  on public.nexus_mission_checks (workflow_id, checked_at desc);

create index if not exists nexus_mission_checks_fail_idx
  on public.nexus_mission_checks (checked_at desc)
  where status = 'fail';

drop trigger if exists touch_nexus_war_rooms_updated_at on public.nexus_war_rooms;
create trigger touch_nexus_war_rooms_updated_at
before update on public.nexus_war_rooms
for each row execute function public.touch_updated_at();

drop trigger if exists touch_nexus_observations_updated_at on public.nexus_observations;
create trigger touch_nexus_observations_updated_at
before update on public.nexus_observations
for each row execute function public.touch_updated_at();

drop trigger if exists touch_nexus_commands_updated_at on public.nexus_commands;
create trigger touch_nexus_commands_updated_at
before update on public.nexus_commands
for each row execute function public.touch_updated_at();

drop trigger if exists touch_nexus_mission_workflows_updated_at on public.nexus_mission_workflows;
create trigger touch_nexus_mission_workflows_updated_at
before update on public.nexus_mission_workflows
for each row execute function public.touch_updated_at();
