-- Phase 11: Nexus Commands — safe indexes and runbook linkage.

alter table public.nexus_commands
  add column if not exists runbook_id uuid references public.nexus_runbooks(id) on delete set null;

create index if not exists nexus_commands_runbook_idx
  on public.nexus_commands (runbook_id)
  where runbook_id is not null;

create index if not exists nexus_commands_alert_idx
  on public.nexus_commands (alert_id)
  where alert_id is not null;

create index if not exists nexus_commands_incident_idx
  on public.nexus_commands (incident_id)
  where incident_id is not null;

create index if not exists nexus_commands_observation_idx
  on public.nexus_commands (observation_id)
  where observation_id is not null;

create index if not exists nexus_commands_expires_idx
  on public.nexus_commands (expires_at)
  where expires_at is not null;

create unique index if not exists nexus_commands_dedupe_key_idx
  on public.nexus_commands ((metadata->>'dedupe_key'))
  where metadata ? 'dedupe_key'
    and status in ('suggested', 'pending_approval', 'approved');
