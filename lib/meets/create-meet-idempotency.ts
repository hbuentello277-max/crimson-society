export function createMeetIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isMeetCreateDuplicateError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "23505" && /create_idempotency_key/i.test(error.message ?? "");
}
