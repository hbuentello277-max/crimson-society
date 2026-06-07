"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { NexusAlertSummaryRow } from "@/lib/alerts/types";
import type { NexusCommandSummaryRow } from "@/lib/commands/types";
import type { NexusIncidentSummaryRow } from "@/lib/incidents/types";
import type { IntelligenceItem } from "@/lib/intelligence/types";
import type { NexusObservationSummaryRow } from "@/lib/observations/types";
import type { NexusHealthIntegrationSummary } from "@/lib/monitoring/health-summary";
import {
  buildFounderPriorities,
  deriveFounderBrief,
  derivePlatformStatus,
  extractOpportunities,
  type FounderBrief,
  type FounderPriority,
  type PlatformRingStatus,
} from "@/lib/nexus/founder-derive";
import { countDegradedWorkflows } from "@/lib/mission-health/degraded";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";

type MetricsPayload = {
  growth?: {
    total_users?: number | null;
    new_users_this_week?: number | null;
    active_profiles?: number | null;
  };
  blackcard?: { active_members?: number | null };
  revenue?: { estimated_mrr?: number | null; estimated_arr?: number | null };
};

type HealthPayload = {
  system?: { status?: string; checked_at?: string | null };
  integrations?: NexusHealthIntegrationSummary[];
};

type MissionPayload = {
  score?: number;
  status?: string;
  checked_at?: string | null;
  workflows?: Array<{ slug: string; display_name: string; workflow_status: string }>;
};

type AlertsPayload = {
  counts?: { active?: number; critical?: number };
  active?: NexusAlertSummaryRow[];
};

type IncidentsPayload = {
  open?: NexusIncidentSummaryRow[];
};

type ObservationsPayload = {
  counts?: { active?: number };
  active?: NexusObservationSummaryRow[];
};

type CommandsPayload = {
  counts?: {
    suggested?: number;
    pending_approval?: number;
    approved?: number;
  };
  commands?: NexusCommandSummaryRow[];
};

type IntelligencePayload = {
  items?: IntelligenceItem[];
};

const ENDPOINTS = [
  "/api/nexus/health",
  "/api/nexus/metrics",
  "/api/nexus/mission-health",
  "/api/nexus/alerts",
  "/api/nexus/incidents",
  "/api/nexus/observations?view=active",
  "/api/nexus/commands",
  "/api/nexus/intelligence?sort=impact",
] as const;

export function useNexusFounderDashboard() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [mission, setMission] = useState<MissionPayload | null>(null);
  const [alerts, setAlerts] = useState<AlertsPayload | null>(null);
  const [incidents, setIncidents] = useState<IncidentsPayload | null>(null);
  const [observations, setObservations] = useState<ObservationsPayload | null>(null);
  const [commands, setCommands] = useState<CommandsPayload | null>(null);
  const [intelligence, setIntelligence] = useState<IntelligencePayload | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (options?: { bypassCache?: boolean }) => {
    setLoading(true);
    const results = await Promise.allSettled(
      ENDPOINTS.map((path) =>
        fetchNexusClientJson<Record<string, unknown>>(path, {
          bypassCache: options?.bypassCache ?? false,
        }),
      ),
    );
    const nextErrors: string[] = [];

    results.forEach((result, index) => {
      const path = ENDPOINTS[index];
      if (result.status === "rejected") {
        nextErrors.push(`${path}: ${result.reason instanceof Error ? result.reason.message : "failed"}`);
        return;
      }

      const payload = result.value;
      if (path.includes("/health")) setHealth(payload as HealthPayload);
      else if (path.includes("/metrics")) setMetrics(payload as MetricsPayload);
      else if (path.includes("/mission-health")) setMission(payload as MissionPayload);
      else if (path.includes("/alerts")) setAlerts(payload as AlertsPayload);
      else if (path.includes("/incidents")) setIncidents(payload as IncidentsPayload);
      else if (path.includes("/observations")) setObservations(payload as ObservationsPayload);
      else if (path.includes("/commands")) setCommands(payload as CommandsPayload);
      else if (path.includes("/intelligence")) setIntelligence(payload as IntelligencePayload);
    });

    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const derived = useMemo(() => {
    const workflows = mission?.workflows ?? [];
    const degradedWorkflows = countDegradedWorkflows(workflows);

    const platformStatus: PlatformRingStatus = derivePlatformStatus({
      systemStatus: health?.system?.status ?? "unknown",
      missionStatus: mission?.status ?? "unknown",
      criticalAlerts: alerts?.counts?.critical ?? 0,
      openIncidents: incidents?.open?.length ?? 0,
      degradedWorkflows,
    });

    const brief: FounderBrief = deriveFounderBrief({
      platformStatus,
      criticalAlerts: alerts?.counts?.critical ?? 0,
      openIncidents: incidents?.open?.length ?? 0,
      pendingCommands: commands?.counts?.pending_approval ?? 0,
      newUsersWeek: metrics?.growth?.new_users_this_week ?? null,
      degradedWorkflows,
    });

    const priorities = buildFounderPriorities({
      alerts: alerts?.active ?? [],
      incidents: incidents?.open ?? [],
      observations: observations?.active ?? [],
      commands: commands?.commands ?? [],
    });

    const opportunities = extractOpportunities(intelligence?.items ?? []);

    return {
      platformStatus,
      brief,
      priorities,
      opportunities,
      degradedWorkflows,
    };
  }, [alerts, commands, health, incidents, intelligence, metrics, mission, observations]);

  const forceRefresh = useCallback(async () => {
    await refresh({ bypassCache: true });
  }, [refresh]);

  return {
    health,
    metrics,
    mission,
    alerts,
    incidents,
    observations,
    commands,
    intelligence,
    errors,
    loading,
    refresh: forceRefresh,
    ...derived,
  };
}
