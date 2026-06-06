-- Phase 8A: extend observation_type to include diagnosis + dedupe lookup index.

alter table public.nexus_observations
  drop constraint if exists nexus_observations_observation_type_check;

alter table public.nexus_observations
  add constraint nexus_observations_observation_type_check check (
    observation_type in (
      'trend',
      'anomaly',
      'correlation',
      'regression',
      'milestone',
      'summary',
      'diagnosis'
    )
  );

create index if not exists nexus_observations_dedupe_key_active_idx
  on public.nexus_observations ((metadata->>'dedupe_key'))
  where status = 'active' and metadata->>'dedupe_key' is not null;
