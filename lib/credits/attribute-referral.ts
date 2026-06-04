import type { SupabaseClient } from "@supabase/supabase-js";
import { REFERRAL_ATTRIBUTION_ERRORS } from "@/lib/credits/referral-code";
import { clearSignupReferralCode } from "@/lib/credits/signup-referral-session";

export type AttributeReferralResult =
  | { ok: true; referrerId?: string }
  | { ok: false; error: string; message: string };

export async function attributeReferral(
  supabase: SupabaseClient,
  referralCode: string,
): Promise<AttributeReferralResult> {
  const code = referralCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "no_code", message: "" };
  }

  const { data, error } = await supabase.rpc("attribute_referral", {
    p_referral_code: code,
  });

  if (error) {
    return { ok: false, error: "rpc_error", message: error.message };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    referrer_id?: string;
  } | null;

  if (!payload?.ok) {
    const reason = payload?.error || "unknown";
    return {
      ok: false,
      error: reason,
      message: REFERRAL_ATTRIBUTION_ERRORS[reason] || "Could not apply referral code.",
    };
  }

  clearSignupReferralCode();
  return { ok: true, referrerId: payload.referrer_id };
}
