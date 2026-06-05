import type { SupabaseClient } from "@supabase/supabase-js";

export type WebhookClaimResult = "claimed" | "duplicate" | "processing";

export async function claimStripeWebhookEvent(
  admin: SupabaseClient,
  eventId: string,
  eventType: string,
): Promise<WebhookClaimResult> {
  const { error: insertError } = await admin.from("stripe_webhook_events").insert({
    id: eventId,
    event_type: eventType,
    status: "processing",
    attempts: 1,
    received_at: new Date().toISOString(),
    processed_at: null,
    last_error: null,
  });

  if (!insertError) {
    return "claimed";
  }

  if (insertError.code !== "23505") {
    throw insertError;
  }

  const { data: existing, error: loadError } = await admin
    .from("stripe_webhook_events")
    .select("status, attempts")
    .eq("id", eventId)
    .maybeSingle();

  if (loadError) {
    throw loadError;
  }

  if (existing?.status === "failed") {
    const { data: retried, error: retryError } = await admin
      .from("stripe_webhook_events")
      .update({
        status: "processing",
        event_type: eventType,
        attempts: Number(existing.attempts ?? 0) + 1,
        processed_at: null,
        last_error: null,
      })
      .eq("id", eventId)
      .eq("status", "failed")
      .select("id")
      .maybeSingle();

    if (retryError) {
      throw retryError;
    }

    return retried ? "claimed" : "processing";
  }

  return existing?.status === "processing" ? "processing" : "duplicate";
}

export async function markStripeWebhookProcessed(
  admin: SupabaseClient,
  eventId: string,
) {
  const { error } = await admin.from("stripe_webhook_events").update({
    status: "processed",
    processed_at: new Date().toISOString(),
    last_error: null,
  }).eq("id", eventId);

  if (error) {
    throw error;
  }
}

export async function markStripeWebhookFailed(
  admin: SupabaseClient,
  eventId: string,
  errorMessage: string,
) {
  const { error } = await admin.from("stripe_webhook_events").update({
    status: "failed",
    processed_at: new Date().toISOString(),
    last_error: errorMessage.slice(0, 2000),
  }).eq("id", eventId);

  if (error) {
    throw error;
  }
}

export async function recordStripeWebhookEvent(
  admin: SupabaseClient,
  eventId: string,
  eventType: string,
) {
  const { error } = await admin.from("stripe_webhook_events").upsert({
    id: eventId,
    event_type: eventType,
    status: "processed",
    processed_at: new Date().toISOString(),
    last_error: null,
  });

  if (error) {
    throw error;
  }
}
