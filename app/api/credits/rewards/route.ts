import { NextResponse } from "next/server";
import { formatCreditsRewardValueUsd } from "@/lib/credits/config";
import { crimsonCreditRewardImagePublicUrl } from "@/lib/credits/reward-images";
import type { CreditsRewardCatalogItem, CreditsRewardsCatalogResponse } from "@/lib/credits/rewards-api-types";
import type { CrimsonCreditRewardRow } from "@/lib/credits/types";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

const REWARD_COLUMNS =
  "id, slug, title, description, credit_cost, reward_category, reward_kind, metadata, image_path, inventory_total, inventory_remaining, requires_shirt_size, is_active, sort_order";

export async function GET(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, authDetail: auth.authDetail },
      { status: 401 },
    );
  }

  const [rewardsResult, summaryResult, canRedeemResult, cashUsedResult, cashCapResult] =
    await Promise.all([
      auth.supabase
        .from("crimson_credit_rewards")
        .select(REWARD_COLUMNS)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("credit_cost", { ascending: true }),
      auth.supabase.rpc("get_crimson_credits_summary", { p_user_id: auth.userId }),
      auth.supabase.rpc("crimson_credits_member_can_redeem", { p_user_id: auth.userId }),
      auth.supabase.rpc("crimson_credits_monthly_cash_redemption_used", {
        p_user_id: auth.userId,
      }),
      auth.supabase.rpc("crimson_credits_monthly_cash_redemption_cap"),
    ]);

  if (rewardsResult.error) {
    return NextResponse.json({ error: rewardsResult.error.message }, { status: 500 });
  }

  if (summaryResult.error) {
    return NextResponse.json({ error: summaryResult.error.message }, { status: 500 });
  }

  if (canRedeemResult.error || cashUsedResult.error || cashCapResult.error) {
    const message =
      canRedeemResult.error?.message ||
      cashUsedResult.error?.message ||
      cashCapResult.error?.message ||
      "Could not load redemption summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const balance =
    (summaryResult.data as { credits_balance?: number } | null)?.credits_balance ?? 0;

  const rewards: CreditsRewardCatalogItem[] = (rewardsResult.data ?? []).map(
    (row: CrimsonCreditRewardRow) => ({
      ...row,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      image_url: crimsonCreditRewardImagePublicUrl(row.image_path),
    }),
  );

  const payload: CreditsRewardsCatalogResponse = {
    rewards,
    summary: {
      credits_balance: balance,
      stored_reward_value_usd: formatCreditsRewardValueUsd(balance),
      monthly_cash_redemption_used: Number(cashUsedResult.data ?? 0),
      monthly_cash_redemption_cap: Number(cashCapResult.data ?? 500),
      can_redeem: Boolean(canRedeemResult.data),
    },
  };

  return NextResponse.json(payload);
}
