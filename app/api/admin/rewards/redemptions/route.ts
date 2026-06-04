import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import type { AdminCreditRedemptionRow } from "@/lib/credits/admin-rewards-types";
import { resolveDisplayLabel } from "@/lib/credits/admin-user-display";

const REDEMPTION_COLUMNS =
  "id, user_id, reward_id, reward_slug, reward_title, reward_category, credits_spent, status, shirt_size, fulfillment_notes, refund_transaction_id, created_at";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100)));
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

  const admin = createAdminServiceClient();

  let query = admin
    .from("crimson_credit_redemptions")
    .select(REDEMPTION_COLUMNS)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: redemptions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = Array.from(
    new Set((redemptions ?? []).map((row) => row.user_id).filter(Boolean)),
  );

  const profileMap = new Map<string, { username: string | null; display_name: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, username, display_name, full_name")
      .in("id", userIds);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        username: profile.username,
        display_name: resolveDisplayLabel(profile),
      });
    }
  }

  const rows: AdminCreditRedemptionRow[] = (redemptions ?? []).map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      user_id: row.user_id,
      reward_id: row.reward_id,
      reward_slug: row.reward_slug,
      reward_title: row.reward_title,
      reward_category: row.reward_category,
      credits_spent: row.credits_spent,
      status: row.status,
      shirt_size: row.shirt_size,
      fulfillment_notes: row.fulfillment_notes,
      refund_transaction_id: row.refund_transaction_id,
      created_at: row.created_at,
      member_username: profile?.username ?? null,
      member_display_name: profile?.display_name ?? null,
    };
  });

  return NextResponse.json({ redemptions: rows });
}
