import type { SupabaseClient } from "@supabase/supabase-js";

/** Award referrer when referred user has an active Stripe Blackcard subscription. */
export async function awardReferralBlackcardConversion(
  adminClient: SupabaseClient,
  referredUserId: string,
) {
  const { data, error } = await adminClient.rpc("award_referral_blackcard_conversion", {
    p_referred_user_id: referredUserId,
  });

  if (error) {
    console.error("[credits] referral blackcard award failed:", error.message, {
      referredUserId,
    });
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, data };
}
