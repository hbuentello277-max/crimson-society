-- Nexus Mark I: metrics, memory, and deployment tracking.
-- Note: embedding column omitted — pgvector is not enabled in this project.

create table if not exists public.nexus_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  metric_key text not null,
  period text not null check (period in ('hourly', 'daily', 'weekly', 'monthly', '5min')),
  period_start timestamptz not null,
  value numeric not null,
  previous_value numeric,
  dimensions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists nexus_metrics_snapshots_key_period_idx
  on public.nexus_metrics_snapshots (metric_key, period, period_start, dimensions);

create index if not exists nexus_metrics_snapshots_period_start_idx
  on public.nexus_metrics_snapshots (period_start desc);

create table if not exists public.nexus_deployments (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references public.nexus_integrations(id) on delete set null,
  deployment_id text not null,
  commit_sha text,
  commit_message text,
  branch text,
  environment text not null check (environment in ('production', 'preview', 'development')),
  status text not null check (status in ('building', 'ready', 'error', 'cancelled')),
  deployed_by text,
  url text,
  duration_ms integer,
  started_at timestamptz not null,
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists nexus_deployments_deployment_id_key
  on public.nexus_deployments (deployment_id);

create index if not exists nexus_deployments_env_status_idx
  on public.nexus_deployments (environment, started_at desc);

create index if not exists nexus_deployments_commit_idx
  on public.nexus_deployments (commit_sha)
  where commit_sha is not null;

create table if not exists public.nexus_ai_memory (
  id uuid primary key default gen_random_uuid(),
  memory_type text not null check (
    memory_type in ('deployment', 'bug', 'fix', 'milestone', 'security', 'launch', 'decision', 'incident')
  ),
  title text not null,
  summary text not null,
  content text,
  event_id uuid references public.nexus_events(id) on delete set null,
  incident_id uuid references public.nexus_incidents(id) on delete set null,
  deployment_id uuid references public.nexus_deployments(id) on delete set null,
  occurred_at timestamptz not null,
  tags text[] not null default '{}',
  importance integer not null default 5 check (importance between 1 and 10),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_ai_memory_type_occurred_idx
  on public.nexus_ai_memory (memory_type, occurred_at desc);

create index if not exists nexus_ai_memory_tags_idx
  on public.nexus_ai_memory using gin (tags);

create index if not exists nexus_ai_memory_importance_idx
  on public.nexus_ai_memory (importance desc, occurred_at desc);

drop trigger if exists touch_nexus_ai_memory_updated_at on public.nexus_ai_memory;
create trigger touch_nexus_ai_memory_updated_at
before update on public.nexus_ai_memory
for each row execute function public.touch_updated_at();
