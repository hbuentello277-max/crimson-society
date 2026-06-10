const LOG_PREFIX = "[crimson-auth]";

export function logAuthSessionEvent(
  phase: string,
  details: Record<string, unknown>,
) {
  if (typeof console === "undefined") return;
  console.info(LOG_PREFIX, phase, details);
}
