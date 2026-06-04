import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import type { AdminCreditLedgerRow } from "@/lib/credits/admin-types";
import { resolveAvatarUrl } from "@/lib/credits/admin-user-display";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

type ProfileSnippet = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(searchParams.get("limit") ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
  );
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const userId = searchParams.get("user_id");

  try {
    const adminClient = createAdminServiceClient();

    let query = adminClient
      .from("crimson_credit_transactions")
      .select("id, user_id, amount, transaction_type, reason, metadata, created_at")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: transactions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = transactions ?? [];
    const userIds = new Set<string>();
    const referredIds = new Set<string>();

    for (const row of rows) {
      userIds.add(row.user_id);
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      if (typeof meta.referred_user_id === "string") {
        referredIds.add(meta.referred_user_id);
      }
    }

    const allProfileIds = [...new Set([...userIds, ...referredIds])];
    const profileMap = new Map<string, ProfileSnippet>();

    if (allProfileIds.length > 0) {
      const { data: profiles, error: profileError } = await adminClient
        .from("profiles")
        .select("id, username, display_name, full_name, avatar_url, profile_image_url")
        .in("id", allProfileIds);

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }

      for (const p of profiles ?? []) {
        profileMap.set(p.id, {
          username: p.username ?? null,
          display_name: p.display_name ?? p.full_name ?? null,
          avatar_url: resolveAvatarUrl(p),
        });
      }
    }

    const ledger: AdminCreditLedgerRow[] = rows.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const profile = profileMap.get(row.user_id);
      const rideId =
        typeof meta.ride_id === "string"
          ? meta.ride_id
          : typeof meta.rideId === "string"
            ? meta.rideId
            : null;
      const referredUserId =
        typeof meta.referred_user_id === "string" ? meta.referred_user_id : null;
      const referredProfile = referredUserId ? profileMap.get(referredUserId) : undefined;

      return {
        id: row.id,
        created_at: row.created_at,
        user_id: row.user_id,
        username: profile?.username ?? null,
        display_name: profile?.display_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        amount: row.amount,
        transaction_type: row.transaction_type,
        reason: row.reason,
        metadata: meta,
        ride_id: rideId,
        referred_user_id: referredUserId,
        referred_username: referredProfile?.username ?? null,
        referred_display_name: referredProfile?.display_name ?? null,
      };
    });

    return NextResponse.json({ ledger, limit, offset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load ledger.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
