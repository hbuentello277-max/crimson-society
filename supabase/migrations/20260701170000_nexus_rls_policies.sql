-- Nexus Mark I: row-level security for all nexus_* tables.

-- ---------------------------------------------------------------------------
-- Grants: no anon access; authenticated reads via RLS; service_role full access
-- ---------------------------------------------------------------------------

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'nexus_integrations',
    'nexus_health_checks',
    'nexus_events',
    'nexus_activity_log',
    'nexus_incidents',
    'nexus_alerts',
    'nexus_alert_rules',
    'nexus_metrics_snapshots',
    'nexus_deployments',
    'nexus_ai_memory',
    'nexus_war_rooms',
    'nexus_observations',
    'nexus_observation_events',
    'nexus_observation_metrics',
    'nexus_observation_alerts',
    'nexus_commands',
    'nexus_mission_workflows',
    'nexus_mission_checks'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on table public.%I from anon', tbl);
    execute format('grant select on table public.%I to authenticated', tbl);
    execute format('grant all on table public.%I to service_role', tbl);
  end loop;
end;
$$;

grant insert, update on table public.nexus_alerts to authenticated;
grant insert, update on table public.nexus_incidents to authenticated;
grant insert, update on table public.nexus_observations to authenticated;
grant insert, update on table public.nexus_commands to authenticated;
grant insert, update on table public.nexus_war_rooms to authenticated;
grant insert, update on table public.nexus_ai_memory to authenticated;

-- ---------------------------------------------------------------------------
-- Owner SELECT policies (read-only tables)
-- ---------------------------------------------------------------------------

drop policy if exists "Nexus owner reads integrations" on public.nexus_integrations;
create policy "Nexus owner reads integrations"
on public.nexus_integrations for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads health checks" on public.nexus_health_checks;
create policy "Nexus owner reads health checks"
on public.nexus_health_checks for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads events" on public.nexus_events;
create policy "Nexus owner reads events"
on public.nexus_events for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads activity log" on public.nexus_activity_log;
create policy "Nexus owner reads activity log"
on public.nexus_activity_log for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads alert rules" on public.nexus_alert_rules;
create policy "Nexus owner reads alert rules"
on public.nexus_alert_rules for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads metrics snapshots" on public.nexus_metrics_snapshots;
create policy "Nexus owner reads metrics snapshots"
on public.nexus_metrics_snapshots for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads deployments" on public.nexus_deployments;
create policy "Nexus owner reads deployments"
on public.nexus_deployments for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads observation events" on public.nexus_observation_events;
create policy "Nexus owner reads observation events"
on public.nexus_observation_events for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads observation metrics" on public.nexus_observation_metrics;
create policy "Nexus owner reads observation metrics"
on public.nexus_observation_metrics for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads observation alerts" on public.nexus_observation_alerts;
create policy "Nexus owner reads observation alerts"
on public.nexus_observation_alerts for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads mission workflows" on public.nexus_mission_workflows;
create policy "Nexus owner reads mission workflows"
on public.nexus_mission_workflows for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads mission checks" on public.nexus_mission_checks;
create policy "Nexus owner reads mission checks"
on public.nexus_mission_checks for select to authenticated
using (public.is_platform_owner(auth.uid()));

-- ---------------------------------------------------------------------------
-- Owner SELECT + UPDATE policies (owner actions)
-- ---------------------------------------------------------------------------

drop policy if exists "Nexus owner reads alerts" on public.nexus_alerts;
create policy "Nexus owner reads alerts"
on public.nexus_alerts for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates alerts" on public.nexus_alerts;
create policy "Nexus owner updates alerts"
on public.nexus_alerts for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads incidents" on public.nexus_incidents;
create policy "Nexus owner reads incidents"
on public.nexus_incidents for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates incidents" on public.nexus_incidents;
create policy "Nexus owner updates incidents"
on public.nexus_incidents for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads memory" on public.nexus_ai_memory;
create policy "Nexus owner reads memory"
on public.nexus_ai_memory for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner inserts memory" on public.nexus_ai_memory;
create policy "Nexus owner inserts memory"
on public.nexus_ai_memory for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates memory" on public.nexus_ai_memory;
create policy "Nexus owner updates memory"
on public.nexus_ai_memory for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads war rooms" on public.nexus_war_rooms;
create policy "Nexus owner reads war rooms"
on public.nexus_war_rooms for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates war rooms" on public.nexus_war_rooms;
create policy "Nexus owner updates war rooms"
on public.nexus_war_rooms for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads observations" on public.nexus_observations;
create policy "Nexus owner reads observations"
on public.nexus_observations for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates observations" on public.nexus_observations;
create policy "Nexus owner updates observations"
on public.nexus_observations for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner reads commands" on public.nexus_commands;
create policy "Nexus owner reads commands"
on public.nexus_commands for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner inserts commands" on public.nexus_commands;
create policy "Nexus owner inserts commands"
on public.nexus_commands for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates commands" on public.nexus_commands;
create policy "Nexus owner updates commands"
on public.nexus_commands for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));
