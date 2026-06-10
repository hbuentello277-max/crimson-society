import type { NavigationGpsState } from "@/lib/meets/use-navigation-gps";

export const GPS_STALE_TIMEOUT_MS = 30_000;
export const GPS_RECOVERY_COOLDOWN_MS = 30_000;
export const GPS_STALE_CHECK_INTERVAL_MS = 5_000;

export const GPS_SIGNAL_LOST_MESSAGE = "GPS signal lost. Reconnecting...";

const RECOVERABLE_GPS_STATES = new Set<NavigationGpsState>(["active", "error", "recovering"]);

export function isGpsUpdateStale(
  lastUpdateAtMs: number | null,
  nowMs: number,
  staleTimeoutMs: number = GPS_STALE_TIMEOUT_MS,
): boolean {
  if (lastUpdateAtMs === null) return false;
  return nowMs - lastUpdateAtMs >= staleTimeoutMs;
}

export function canAttemptGpsRecovery(
  lastRecoveryAtMs: number | null,
  nowMs: number,
  cooldownMs: number = GPS_RECOVERY_COOLDOWN_MS,
): boolean {
  if (lastRecoveryAtMs === null) return true;
  return nowMs - lastRecoveryAtMs >= cooldownMs;
}

export function shouldTriggerStaleGpsRecovery(input: {
  enabled: boolean;
  gpsState: NavigationGpsState;
  lastUpdateAtMs: number | null;
  lastRecoveryAtMs: number | null;
  nowMs: number;
  staleTimeoutMs?: number;
  recoveryCooldownMs?: number;
}): boolean {
  if (!input.enabled) return false;
  if (!RECOVERABLE_GPS_STATES.has(input.gpsState)) return false;
  if (input.lastUpdateAtMs === null) return false;
  if (!isGpsUpdateStale(input.lastUpdateAtMs, input.nowMs, input.staleTimeoutMs)) {
    return false;
  }

  return canAttemptGpsRecovery(
    input.lastRecoveryAtMs,
    input.nowMs,
    input.recoveryCooldownMs,
  );
}

export function logGpsRecoveryAttempt(meta: Record<string, unknown> = {}) {
  console.info("[crimson-nav-gps] stale recovery attempt", meta);
}
