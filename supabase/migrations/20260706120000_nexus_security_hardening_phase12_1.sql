-- Phase 12.1: Nexus security hardening.
-- Keep owner-only RLS policies intact while reducing broad authenticated grants.

do $$
declare
  tbl record;
begin
  for tbl in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
      and tablename like 'nexus\_%' escape '\'
  loop
    execute format('alter table %I.%I enable row level security', tbl.schemaname, tbl.tablename);
    execute format('revoke all on table %I.%I from anon', tbl.schemaname, tbl.tablename);
    execute format('revoke all on table %I.%I from authenticated', tbl.schemaname, tbl.tablename);
    execute format('grant all on table %I.%I to service_role', tbl.schemaname, tbl.tablename);
  end loop;
end;
$$;

-- Owner UI/API read access remains protected by public.is_platform_owner(auth.uid()) RLS policies.
grant select on table
  public.nexus_integrations,
  public.nexus_health_checks,
  public.nexus_events,
  public.nexus_activity_log,
  public.nexus_incidents,
  public.nexus_alerts,
  public.nexus_alert_rules,
  public.nexus_metrics_snapshots,
  public.nexus_deployments,
  public.nexus_ai_memory,
  public.nexus_war_rooms,
  public.nexus_observations,
  public.nexus_observation_events,
  public.nexus_observation_metrics,
  public.nexus_observation_alerts,
  public.nexus_commands,
  public.nexus_mission_workflows,
  public.nexus_mission_checks,
  public.nexus_runbooks
to authenticated;

-- Owner UI/API mutations that exist today.
grant update on table
  public.nexus_alerts,
  public.nexus_incidents,
  public.nexus_observations,
  public.nexus_war_rooms,
  public.nexus_commands
to authenticated;

-- Runbooks are the only Nexus table with owner-managed CRUD in Mark I.
grant insert, update, delete on table public.nexus_runbooks to authenticated;
