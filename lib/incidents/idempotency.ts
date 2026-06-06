/** Stable idempotency key for a set of alert IDs (order-independent). */
export function buildIncidentIdempotencyKey(alertIds: string[]): string {
  const unique = [...new Set(alertIds)].sort();
  return `alerts:${unique.join(":")}`;
}
