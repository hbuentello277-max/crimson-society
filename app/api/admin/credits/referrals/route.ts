import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import type { AdminCreditReferralRow } from "@/lib/credits/admin-types";
import { resolveAvatarUrl } from "@/lib/credits/admin-user-display";

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const adminClient = createAdminServiceClient();

    const { data: referredProfiles, error: profileError } = await adminClient
      .from("profiles")
      .select(
        "id, username, display_name, full_name, avatar_url, profile_image_url, referred_by_user_id, premium_tier",
      )
      .not("referred_by_user_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const rows = referredProfiles ?? [];
    if (rows.length === 0) {
      return NextResponse.json({ referrals: [] as AdminCreditReferralRow[] });
    }

    const referrerIds = [...new Set(rows.map((r) => r.referred_by_user_id).filter(Boolean))] as string[];
    const referredIds = rows.map((r) => r.id);

    const [{ data: referrers }, { data: subscriptions }, { data: signupAwards }, { data: blackcardAwards }] =
      await Promise.all([
        adminClient
          .from("profiles")
          .select("id, username, display_name, full_name, avatar_url, profile_image_url, referral_code")
          .in("id", referrerIds),
        adminClient
          .from("subscriptions")
          .select("user_id, status")
          .in("user_id", referredIds)
          .in("status", ["active", "trialing"]),
        adminClient
          .from("crimson_credit_transactions")
          .select("metadata")
          .eq("transaction_type", "referral_signup")
          .in("user_id", referrerIds),
        adminClient
          .from("crimson_credit_transactions")
          .select("metadata")
          .eq("transaction_type", "referral_blackcard")
          .in("user_id", referrerIds),
      ]);

    const referrerMap = new Map(
      (referrers ?? []).map((r) => [
        r.id,
        {
          username: r.username ?? null,
          display_name: r.display_name ?? r.full_name ?? null,
          avatar_url: resolveAvatarUrl(r),
          referral_code: r.referral_code ?? null,
        },
      ]),
    );

    const subStatusByUser = new Map<string, string>();
    for (const sub of subscriptions ?? []) {
      subStatusByUser.set(sub.user_id, sub.status);
    }

    const signupAwarded = new Set<string>();
    for (const tx of signupAwards ?? []) {
      const meta = tx.metadata as Record<string, unknown>;
      if (typeof meta.referred_user_id === "string") {
        signupAwarded.add(meta.referred_user_id);
      }
    }

    const blackcardAwarded = new Set<string>();
    for (const tx of blackcardAwards ?? []) {
      const meta = tx.metadata as Record<string, unknown>;
      if (typeof meta.referred_user_id === "string") {
        blackcardAwarded.add(meta.referred_user_id);
      }
    }

    const referrals: AdminCreditReferralRow[] = rows.map((referred) => {
      const referrerId = referred.referred_by_user_id as string;
      const referrer = referrerMap.get(referrerId);

      return {
        referrer_id: referrerId,
        referrer_username: referrer?.username ?? null,
        referrer_display_name: referrer?.display_name ?? null,
        referrer_avatar_url: referrer?.avatar_url ?? null,
        referral_code: referrer?.referral_code ?? null,
        referred_user_id: referred.id,
        referred_username: referred.username ?? null,
        referred_display_name: referred.display_name ?? referred.full_name ?? null,
        referred_avatar_url: resolveAvatarUrl(referred),
        signup_reward_awarded: signupAwarded.has(referred.id),
        blackcard_reward_awarded: blackcardAwarded.has(referred.id),
        subscription_status: subStatusByUser.get(referred.id) ?? null,
        premium_tier: referred.premium_tier ?? null,
      };
    });

    return NextResponse.json({ referrals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load referrals.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
