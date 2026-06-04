import type { SupabaseClient } from "@supabase/supabase-js";

export type WebhookIdempotencyResult = "new" | "duplicate";

/**
 * Returns duplicate if this Stripe event id was already recorded.
 * Uses existing stripe_webhook_events table (Blackcard Phase 0).
 */
export async function checkStripeWebhookDuplicate(
  admin: SupabaseClient,
  eventId: string,
): Promise<WebhookIdempotencyResult> {
  const { data, error } = await admin
    .from("stripe_webhook_events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? "duplicate" : "new";
}

export async function recordStripeWebhookEvent(
  admin: SupabaseClient,
  eventId: string,
  eventType: string,
) {
  const { error } = await admin.from("stripe_webhook_events").insert({
    id: eventId,
    event_type: eventType,
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}
