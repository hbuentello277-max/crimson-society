import type { SupabaseClient } from "@supabase/supabase-js";
import { hasActiveMembership, hasAdminBlackcardOverride, type MembershipRow } from "@/lib/membership";

/**
 * Recomputes profiles.blackcard_public from Stripe subscriptions and admin overrides.
 * Called after Stripe webhook subscription upserts/deletes and admin membership actions.
 */
export async function syncBlackcardPublicForUser(
  adminClient: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const [{ data: profile, error: profileError }, { data: rows, error: loadError }] =
    await Promise.all([
      adminClient
        .from("profiles")
        .select("is_premium, premium_tier, premium_expires_at")
        .eq("id", userId)
        .maybeSingle(),
      adminClient
        .from("subscriptions")
        .select("status, plan_type, current_period_end")
        .eq("user_id", userId)
        .in("status", ["active", "trialing"]),
    ]);

  if (profileError) {
    throw profileError;
  }

  if (loadError) {
    throw loadError;
  }

  const isActive =
    hasAdminBlackcardOverride(profile) ||
    (rows ?? []).some((row) => hasActiveMembership(row as MembershipRow));

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ blackcard_public: isActive })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }

  return isActive;
}
