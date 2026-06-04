import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import type { AdminCreditBalanceRow } from "@/lib/credits/admin-types";
import { mergeEconomySettings } from "@/lib/credits/economy-settings";
import { resolveAvatarUrl, resolveMembershipLabel } from "@/lib/credits/admin-user-display";

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const adminClient = createAdminServiceClient();

    const [{ data: economyRow }, { data: creditsRows, error: creditsError }] = await Promise.all([
      adminClient
        .from("platform_settings")
        .select("value")
        .eq("key", "crimson_credits_economy")
        .maybeSingle(),
      adminClient
        .from("crimson_credits")
        .select("user_id, credits_balance, lifetime_credits_earned, lifetime_credits_spent")
        .order("credits_balance", { ascending: false }),
    ]);

    if (creditsError) {
      return NextResponse.json({ error: creditsError.message }, { status: 500 });
    }

    const economy = mergeEconomySettings(economyRow?.value as Record<string, unknown> | undefined);
    const monthlyCap = economy.monthly_earn_cap;

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { data: monthlyTx, error: txError } = await adminClient
      .from("crimson_credit_transactions")
      .select("user_id, amount, transaction_type")
      .gte("created_at", monthStart.toISOString())
      .gt("amount", 0)
      .neq("transaction_type", "admin_adjustment");

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    const monthlyByUser = new Map<string, number>();
    for (const tx of monthlyTx ?? []) {
      monthlyByUser.set(tx.user_id, (monthlyByUser.get(tx.user_id) ?? 0) + tx.amount);
    }

    const userIds = [...new Set((creditsRows ?? []).map((r) => r.user_id))];
    const profileMap = new Map<
      string,
      {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
        membership_label: string;
      }
    >();

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await adminClient
        .from("profiles")
        .select(
          "id, username, display_name, full_name, avatar_url, profile_image_url, is_premium, premium_tier, membership_tier, is_founding_blackcard",
        )
        .in("id", userIds);

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      for (const p of profiles ?? []) {
        profileMap.set(p.id, {
          username: p.username ?? null,
          display_name: p.display_name ?? p.full_name ?? null,
          avatar_url: resolveAvatarUrl(p),
          membership_label: resolveMembershipLabel(p),
        });
      }
    }

    const balances: AdminCreditBalanceRow[] = (creditsRows ?? []).map((row) => {
      const profile = profileMap.get(row.user_id);
      const monthlyEarned = monthlyByUser.get(row.user_id) ?? 0;

      return {
        user_id: row.user_id,
        username: profile?.username ?? null,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        membership_label: profile?.membership_label ?? "Free Member",
        credits_balance: row.credits_balance,
        lifetime_credits_earned: row.lifetime_credits_earned,
        lifetime_credits_spent: row.lifetime_credits_spent,
        monthly_earned: monthlyEarned,
        monthly_cap: monthlyCap,
      };
    });

    return NextResponse.json({ balances, monthly_cap: monthlyCap });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load balances.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
