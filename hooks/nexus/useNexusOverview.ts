"use client";

import { useCallback, useEffect, useState } from "react";

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

async function fetchEndpoint(path: string) {
  const response = await fetch(path, { credentials: "include", cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    throw new Error(
      (payload?.error as string | undefined) || `Request failed (${response.status})`,
    );
  }

  return payload;
}

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

  const refresh = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled(
      ENDPOINTS.map((endpoint) => fetchEndpoint(endpoint.path)),
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

  return { data, errors, loading, refresh };
}
