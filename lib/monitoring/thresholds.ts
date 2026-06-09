import type { NexusIntegrationSlug } from "@/lib/nexus/constants";

export type LatencyThresholds = {
  passMs: number;
  warnMs: number;
};

export type IntegrationThresholds = {
  latency?: LatencyThresholds;
  webhookFailuresWarn: number;
  webhookFailuresFail: number;
  pushBacklogWarn: number;
  pushBacklogFail: number;
  rateLimitRemainingWarn: number;
  rateLimitRemainingFail: number;
};

export const NEXUS_HEALTH_RECENT_WINDOW_MS = 10 * 60 * 1000;

export const INTEGRATION_THRESHOLDS: Record<NexusIntegrationSlug, IntegrationThresholds> = {
  supabase: {
    latency: { passMs: 1200, warnMs: 2000 },
    webhookFailuresWarn: 1,
    webhookFailuresFail: 3,
    pushBacklogWarn: 100,
    pushBacklogFail: 500,
    rateLimitRemainingWarn: 100,
    rateLimitRemainingFail: 10,
  },
  stripe: {
    latency: { passMs: 500, warnMs: 2000 },
    webhookFailuresWarn: 1,
    webhookFailuresFail: 3,
    pushBacklogWarn: 100,
    pushBacklogFail: 500,
    rateLimitRemainingWarn: 100,
    rateLimitRemainingFail: 10,
  },
  github: {
    latency: { passMs: 500, warnMs: 2000 },
    webhookFailuresWarn: 1,
    webhookFailuresFail: 3,
    pushBacklogWarn: 100,
    pushBacklogFail: 500,
    rateLimitRemainingWarn: 100,
    rateLimitRemainingFail: 10,
  },
  vercel: {
    latency: { passMs: 500, warnMs: 2000 },
    webhookFailuresWarn: 1,
    webhookFailuresFail: 3,
    pushBacklogWarn: 100,
    pushBacklogFail: 500,
    rateLimitRemainingWarn: 100,
    rateLimitRemainingFail: 10,
  },
  resend: {
    latency: { passMs: 500, warnMs: 2000 },
    webhookFailuresWarn: 1,
    webhookFailuresFail: 3,
    pushBacklogWarn: 100,
    pushBacklogFail: 500,
    rateLimitRemainingWarn: 100,
    rateLimitRemainingFail: 10,
  },
  crimson_society: {
    latency: { passMs: 500, warnMs: 2000 },
    webhookFailuresWarn: 1,
    webhookFailuresFail: 3,
    pushBacklogWarn: 100,
    pushBacklogFail: 500,
    rateLimitRemainingWarn: 100,
    rateLimitRemainingFail: 10,
  },
};

export function latencyStatus(
  latencyMs: number,
  thresholds: LatencyThresholds,
): "pass" | "warn" | "fail" {
  if (latencyMs <= thresholds.passMs) {
    return "pass";
  }

  if (latencyMs <= thresholds.warnMs) {
    return "warn";
  }

  return "fail";
}
