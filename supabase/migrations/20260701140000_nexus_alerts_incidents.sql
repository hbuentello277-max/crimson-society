-- Nexus Mark I: alerts, incidents, and alert rules.

create table if not exists public.nexus_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'open' check (
    status in ('open', 'investigating', 'mitigated', 'resolved', 'postmortem')
  ),
  severity text not null check (severity in ('warning', 'critical')),
  integration_id uuid references public.nexus_integrations(id) on delete set null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  root_cause text,
  impact_summary text,
  timeline jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_incidents_status_idx
  on public.nexus_incidents (status, started_at desc);

create index if not exists nexus_incidents_open_idx
  on public.nexus_incidents (started_at desc)
  where status in ('open', 'investigating');

create table if not exists public.nexus_alerts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.nexus_events(id) on delete set null,
  incident_id uuid references public.nexus_incidents(id) on delete set null,
  category text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  status text not null default 'active' check (
    status in ('active', 'acknowledged', 'resolved', 'suppressed')
  ),
  rule_id text,
  dedupe_key text,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  playbook_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_alerts_status_severity_idx
  on public.nexus_alerts (status, severity, created_at desc);

create unique index if not exists nexus_alerts_dedupe_key_idx
  on public.nexus_alerts (dedupe_key)
  where status = 'active' and dedupe_key is not null;

create index if not exists nexus_alerts_incident_idx
  on public.nexus_alerts (incident_id)
  where incident_id is not null;

create table if not exists public.nexus_alert_rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null unique,
  name text not null,
  category text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  condition jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  cooldown_minutes integer not null default 60,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_nexus_incidents_updated_at on public.nexus_incidents;
create trigger touch_nexus_incidents_updated_at
before update on public.nexus_incidents
for each row execute function public.touch_updated_at();

drop trigger if exists touch_nexus_alerts_updated_at on public.nexus_alerts;
create trigger touch_nexus_alerts_updated_at
before update on public.nexus_alerts
for each row execute function public.touch_updated_at();

drop trigger if exists touch_nexus_alert_rules_updated_at on public.nexus_alert_rules;
create trigger touch_nexus_alert_rules_updated_at
before update on public.nexus_alert_rules
for each row execute function public.touch_updated_at();
