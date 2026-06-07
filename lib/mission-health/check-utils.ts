import type { SupabaseClient } from "@supabase/supabase-js";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import type { MissionCheckMethod, MissionCheckResult, MissionCheckStatus, MissionWorkflowSlug } from "@/lib/mission-health/types";
import type { MissionThresholdMode, MissionWorkflowDefinition } from "@/lib/mission-health/workflows";
import { workflowScoreFromCheckStatus } from "@/lib/mission-health/scoring";

export function nowIso(): string {
  return new Date().toISOString();
}

export function windowStartIso(windowMinutes: number): string {
  return new Date(Date.now() - windowMinutes * 60_000).toISOString();
}

export async function countRowsSince(
  admin: SupabaseClient,
  table: string,
  sinceIso: string,
  options?: {
    timestampColumn?: string;
    filters?: Array<{ column: string; op: "eq" | "gte" | "lte" | "in" | "is"; value: unknown }>;
  },
): Promise<{ count: number | null; error: string | null }> {
  const timestampColumn = options?.timestampColumn ?? "created_at";
  let query = admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(timestampColumn, sinceIso);

  for (const filter of options?.filters ?? []) {
    if (filter.op === "eq") {
      query = query.eq(filter.column, filter.value);
    } else if (filter.op === "gte") {
      query = query.gte(filter.column, filter.value);
    } else if (filter.op === "lte") {
      query = query.lte(filter.column, filter.value);
    } else if (filter.op === "in") {
      query = query.in(filter.column, filter.value as string[]);
    } else if (filter.op === "is") {
      query = query.is(filter.column, filter.value as null);
    }
  }

  const { count, error } = await query;
  if (error) {
    return { count: null, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export async function countAuthUsersSince(
  admin: SupabaseClient,
  column: "created_at" | "last_sign_in_at",
  sinceIso: string,
): Promise<{ count: number | null; error: string | null }> {
  const { count, error } = await admin
    .schema("auth")
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte(column, sinceIso);

  if (error) {
    return { count: null, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

export function evaluateThresholdStatus(input: {
  mode: MissionThresholdMode;
  value: number;
  warning_threshold: number;
  critical_threshold: number;
}): MissionCheckStatus {
  const { mode, value, warning_threshold, critical_threshold } = input;

  if (mode === "min_activity") {
    return "pass";
  }

  if (mode === "max_failures" || mode === "max_pending") {
    if (value >= critical_threshold) {
      return "fail";
    }

    if (value >= warning_threshold) {
      return "warn";
    }

    return "pass";
  }

  return "warn";
}

export function buildMissionCheckResult(input: {
  workflow_slug: MissionWorkflowSlug;
  status: MissionCheckStatus;
  check_method: MissionCheckMethod;
  latency_ms?: number | null;
  details?: Record<string, unknown>;
  checked_at?: string;
}): MissionCheckResult {
  const status = input.status;
  return {
    workflow_slug: input.workflow_slug,
    status,
    check_method: input.check_method,
    latency_ms: input.latency_ms ?? null,
    details: safeProbeDetails(input.details ?? {}),
    checked_at: input.checked_at ?? nowIso(),
    workflow_score: workflowScoreFromCheckStatus(status),
  };
}

export function evaluateActivityCheck(input: {
  definition: MissionWorkflowDefinition;
  count: number | null;
  error: string | null;
  signal: string;
  extraDetails?: Record<string, unknown>;
  check_method?: MissionCheckMethod;
}): MissionCheckResult {
  const { definition, count, error, signal, extraDetails, check_method } = input;

  if (error) {
    return buildMissionCheckResult({
      workflow_slug: definition.slug,
      status: "fail",
      check_method: check_method ?? "db_signal",
      details: {
        signal,
        error,
        table_accessible: false,
        ...extraDetails,
      },
    });
  }

  const activityCount = count ?? 0;
  const status = evaluateThresholdStatus({
    mode: definition.threshold_mode,
    value: activityCount,
    warning_threshold: definition.warning_threshold,
    critical_threshold: definition.critical_threshold,
  });
  const lowActivity =
    definition.threshold_mode === "min_activity" && activityCount < definition.warning_threshold;

  return buildMissionCheckResult({
    workflow_slug: definition.slug,
    status,
    check_method: check_method ?? "db_signal",
    details: {
      signal,
      table_accessible: true,
      activity_count: activityCount,
      window_minutes: definition.activity_window_minutes,
      threshold_mode: definition.threshold_mode,
      warning_threshold: definition.warning_threshold,
      critical_threshold: definition.critical_threshold,
      activity_state: lowActivity ? "quiet_activity" : "active",
      low_activity: lowActivity,
      ...extraDetails,
    },
  });
}

export async function timedCheck<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; latency_ms: number }> {
  const started = Date.now();
  const result = await fn();
  return { result, latency_ms: Date.now() - started };
}
