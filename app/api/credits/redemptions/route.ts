import { NextResponse } from "next/server";
import type { CreditsRedemptionsResponse } from "@/lib/credits/rewards-api-types";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

const REDEMPTION_COLUMNS =
  "id, user_id, reward_id, reward_slug, reward_title, reward_category, reward_kind, credits_spent, status, shirt_size, fulfillment_notes, debit_transaction_id, refund_transaction_id, created_at";

export async function GET(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, authDetail: auth.authDetail },
      { status: 401 },
    );
  }

  const { data, error } = await auth.supabase
    .from("crimson_credit_redemptions")
    .select(REDEMPTION_COLUMNS)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload: CreditsRedemptionsResponse = {
    redemptions: data ?? [],
  };

  return NextResponse.json(payload);
}
