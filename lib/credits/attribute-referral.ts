import type { SupabaseClient } from "@supabase/supabase-js";
import { clearPersistedReferralCode, readPersistedReferralCode } from "@/lib/credits/referral-storage";

export type AttributeReferralResult =
  | { ok: true; referrerId?: string }
  | { ok: false; error: string };

export async function attributeReferralIfNeeded(
  supabase: SupabaseClient,
  explicitCode?: string | null,
): Promise<AttributeReferralResult> {
  const code = explicitCode?.trim().toUpperCase() || readPersistedReferralCode();
  if (!code) {
    return { ok: false, error: "no_code" };
  }

  const { data, error } = await supabase.rpc("attribute_referral", {
    p_referral_code: code,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    referrer_id?: string;
  } | null;

  if (!payload?.ok) {
    const reason = payload?.error || "unknown";
    if (reason === "already_referred" || reason === "invalid_code") {
      clearPersistedReferralCode();
    }
    return { ok: false, error: reason };
  }

  clearPersistedReferralCode();
  return { ok: true, referrerId: payload.referrer_id };
}
