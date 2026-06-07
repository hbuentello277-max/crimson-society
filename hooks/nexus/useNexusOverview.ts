"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";

type OverviewPayload = {
  health: Record<string, unknown> | null;
  missionHealth: Record<string, unknown> | null;
  metrics: Record<string, unknown> | null;
  alerts: Record<string, unknown> | null;
  incidents: Record<string, unknown> | null;
  observations: Record<string, unknown> | null;
  events: Record<string, unknown> | null;
};

type OverviewState = {
  data: OverviewPayload;
  errors: string[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const ENDPOINTS = [
  { key: "health", path: "/api/nexus/health" },
  { key: "missionHealth", path: "/api/nexus/mission-health" },
  { key: "metrics", path: "/api/nexus/metrics" },
  { key: "alerts", path: "/api/nexus/alerts" },
  { key: "incidents", path: "/api/nexus/incidents" },
  { key: "observations", path: "/api/nexus/observations?view=active" },
  { key: "events", path: "/api/nexus/events?limit=10" },
] as const;

export function useNexusOverview(): OverviewState {
  const [data, setData] = useState<OverviewPayload>({
    health: null,
    missionHealth: null,
    metrics: null,
    alerts: null,
    incidents: null,
    observations: null,
    events: null,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (options?: { bypassCache?: boolean }) => {
    setLoading(true);

    const results = await Promise.allSettled(
      ENDPOINTS.map((endpoint) =>
        fetchNexusClientJson<Record<string, unknown>>(endpoint.path, {
          bypassCache: options?.bypassCache ?? false,
        }),
      ),
    );

    const nextData: OverviewPayload = {
      health: null,
      missionHealth: null,
      metrics: null,
      alerts: null,
      incidents: null,
      observations: null,
      events: null,
    };
    const nextErrors: string[] = [];

    results.forEach((result, index) => {
      const key = ENDPOINTS[index]?.key;
      if (!key) {
        return;
      }

      if (result.status === "fulfilled") {
        nextData[key] = result.value;
      } else {
        nextErrors.push(
          `${ENDPOINTS[index]?.path}: ${result.reason instanceof Error ? result.reason.message : "failed"}`,
        );
      }
    });

    setData(nextData);
    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const forceRefresh = useCallback(async () => {
    await refresh({ bypassCache: true });
  }, [refresh]);

  return { data, errors, loading, refresh: forceRefresh };
}
