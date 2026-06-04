import { NextResponse } from "next/server";
import { isCrimsonCreditShirtSize } from "@/lib/credits/rewards-ui";
import type { CreditsRedeemRewardRequest, CreditsRedeemRewardResponse } from "@/lib/credits/rewards-api-types";
import type { RedeemCrimsonCreditRewardResult } from "@/lib/credits/types";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

function mapRedeemError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("not authenticated")) return 401;
  if (lower.includes("membership is required")) return 403;
  if (
    lower.includes("insufficient credits") ||
    lower.includes("cash-value redemption cap") ||
    lower.includes("out of stock") ||
    lower.includes("shirt_size") ||
    lower.includes("not active") ||
    lower.includes("not found")
  ) {
    return 400;
  }
  return 400;
}

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, authDetail: auth.authDetail },
      { status: 401 },
    );
  }

  let body: CreditsRedeemRewardRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rewardId = body.rewardId?.trim();
  if (!rewardId) {
    return NextResponse.json({ error: "rewardId is required." }, { status: 400 });
  }

  const shirtRaw = body.shirtSize?.trim().toUpperCase() ?? null;
  if (shirtRaw && !isCrimsonCreditShirtSize(shirtRaw)) {
    return NextResponse.json(
      { error: "shirtSize must be one of S, M, L, XL, 2XL." },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase.rpc("redeem_crimson_credit_reward", {
    p_reward_id: rewardId,
    p_shirt_size: shirtRaw,
  });

  if (error) {
    const status = mapRedeemError(error.message);
    return NextResponse.json({ error: error.message }, { status });
  }

  const result = data as RedeemCrimsonCreditRewardResult | null;
  if (!result?.ok) {
    return NextResponse.json({ error: "Redemption failed." }, { status: 400 });
  }

  const { data: rewardRow } = await auth.supabase
    .from("crimson_credit_rewards")
    .select("title")
    .eq("id", rewardId)
    .maybeSingle();

  const payload: CreditsRedeemRewardResponse = {
    ok: true,
    redemption_id: result.redemption_id,
    credits_spent: result.credits_spent,
    credits_balance: result.credits_balance,
    monthly_cash_redemption_used: result.monthly_cash_redemption_used,
    monthly_cash_redemption_cap: result.monthly_cash_redemption_cap,
    reward_title: rewardRow?.title ?? "Reward",
  };

  return NextResponse.json(payload);
}
