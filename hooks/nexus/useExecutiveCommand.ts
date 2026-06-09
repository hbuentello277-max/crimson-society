"use client";

import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import type { ExecutiveCommandSummary } from "@/lib/executive-command/types";

type ExecutiveCommandPayload = ExecutiveCommandSummary & { ok?: boolean };

export function useExecutiveCommand() {
  const { data, error, loading, refresh } = useNexusFetch<ExecutiveCommandPayload>(
    "/api/nexus/executive-command",
  );

  return {
    summary: data,
    error,
    loading,
    refresh,
  };
}
