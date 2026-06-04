import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { mergeEconomySettings } from "@/lib/credits/economy-settings";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const userId = new URL(request.url).searchParams.get("user_id")?.trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  try {
    const adminClient = createAdminServiceClient();

    const [{ data: economyRow }, { data: creditsRow }, { data: profile, error: profileError }] =
      await Promise.all([
        adminClient
          .from("platform_settings")
          .select("value")
          .eq("key", "crimson_credits_economy")
          .maybeSingle(),
        adminClient
          .from("crimson_credits")
          .select("credits_balance, lifetime_credits_earned, lifetime_credits_spent")
          .eq("user_id", userId)
          .maybeSingle(),
        adminClient
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle(),
      ]);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const economy = mergeEconomySettings(economyRow?.value as Record<string, unknown> | undefined);
    const monthlyCap = economy.monthly_earn_cap;

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { data: monthlyTx, error: txError } = await adminClient
      .from("crimson_credit_transactions")
      .select("amount")
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString())
      .gt("amount", 0)
      .neq("transaction_type", "admin_adjustment");

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    const monthlyEarned = (monthlyTx ?? []).reduce((sum, tx) => sum + tx.amount, 0);

    return NextResponse.json({
      summary: {
        user_id: userId,
        credits_balance: creditsRow?.credits_balance ?? 0,
        lifetime_credits_earned: creditsRow?.lifetime_credits_earned ?? 0,
        lifetime_credits_spent: creditsRow?.lifetime_credits_spent ?? 0,
        monthly_earned: monthlyEarned,
        monthly_cap: monthlyCap,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load user summary.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
