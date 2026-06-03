import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveMembership, type MembershipRow } from "@/lib/membership";

/**
 * Recomputes profiles.blackcard_public from the user's subscription rows.
 * Called after Stripe webhook subscription upserts/deletes.
 */
export async function syncBlackcardPublicForUser(
  adminClient: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: rows, error: loadError } = await adminClient
    .from("subscriptions")
    .select("status, plan_type, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"]);

  if (loadError) {
    throw loadError;
  }

  const isActive = (rows ?? []).some((row) =>
    hasActiveMembership(row as MembershipRow),
  );

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ blackcard_public: isActive })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }

  return isActive;
}
