import type { SupabaseClient } from "@supabase/supabase-js";
import { SET_REFERRAL_CODE_ERRORS } from "@/lib/credits/referral-code";

export type SetOwnReferralCodeResult =
  | { ok: true; referralCode: string }
  | { ok: false; error: string; message: string };

export async function setOwnReferralCode(
  supabase: SupabaseClient,
  code: string,
): Promise<SetOwnReferralCodeResult> {
  const { data, error } = await supabase.rpc("set_own_referral_code", {
    p_referral_code: code,
  });

  if (error) {
    return { ok: false, error: "rpc_error", message: error.message };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    referral_code?: string;
  } | null;

  if (!payload?.ok) {
    const reason = payload?.error || "unknown";
    return {
      ok: false,
      error: reason,
      message: SET_REFERRAL_CODE_ERRORS[reason] || "Could not save referral code.",
    };
  }

  return {
    ok: true,
    referralCode: payload.referral_code || code.trim().toUpperCase(),
  };
}

export async function ensureOwnReferralCode(
  supabase: SupabaseClient,
): Promise<SetOwnReferralCodeResult> {
  const { data, error } = await supabase.rpc("ensure_own_referral_code");

  if (error) {
    return { ok: false, error: "rpc_error", message: error.message };
  }

  const payload = data as {
    ok?: boolean;
    error?: string;
    referral_code?: string;
  } | null;

  if (!payload?.ok) {
    const reason = payload?.error || "unknown";
    return {
      ok: false,
      error: reason,
      message: SET_REFERRAL_CODE_ERRORS[reason] || "Could not generate referral code.",
    };
  }

  return {
    ok: true,
    referralCode: payload.referral_code || "",
  };
}
