-- Nexus Mark I: core event and integration tables.

create table if not exists public.nexus_integrations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  status text not null default 'unknown' check (
    status in ('healthy', 'degraded', 'down', 'unknown', 'maintenance')
  ),
  last_check_at timestamptz,
  last_healthy_at timestamptz,
  latency_ms integer,
  error_message text,
  config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_integrations_status_idx
  on public.nexus_integrations (status, last_check_at desc);

create table if not exists public.nexus_events (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid,
  integration_id uuid references public.nexus_integrations(id) on delete set null,
  source text not null check (source in ('collector', 'webhook', 'cron', 'manual', 'system')),
  category text not null,
  event_type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  description text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  processed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists nexus_events_occurred_at_idx
  on public.nexus_events (occurred_at desc);

create index if not exists nexus_events_category_type_idx
  on public.nexus_events (category, event_type, occurred_at desc);

create index if not exists nexus_events_correlation_idx
  on public.nexus_events (correlation_id)
  where correlation_id is not null;

create index if not exists nexus_events_unprocessed_idx
  on public.nexus_events (processed, ingested_at)
  where processed = false;

create index if not exists nexus_events_severity_idx
  on public.nexus_events (severity, occurred_at desc)
  where severity in ('warning', 'critical');

create table if not exists public.nexus_health_checks (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.nexus_integrations(id) on delete cascade,
  check_type text not null,
  status text not null check (status in ('pass', 'warn', 'fail')),
  latency_ms integer,
  response_code integer,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

create index if not exists nexus_health_checks_integration_checked_idx
  on public.nexus_health_checks (integration_id, checked_at desc);

create index if not exists nexus_health_checks_status_idx
  on public.nexus_health_checks (status, checked_at desc)
  where status <> 'pass';

create table if not exists public.nexus_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null check (actor_type in ('owner', 'system', 'collector', 'ai')),
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists nexus_activity_log_created_idx
  on public.nexus_activity_log (created_at desc);

create index if not exists nexus_activity_log_actor_idx
  on public.nexus_activity_log (actor_id, created_at desc);

create index if not exists nexus_activity_log_action_idx
  on public.nexus_activity_log (action, created_at desc);

drop trigger if exists touch_nexus_integrations_updated_at on public.nexus_integrations;
create trigger touch_nexus_integrations_updated_at
before update on public.nexus_integrations
for each row execute function public.touch_updated_at();
