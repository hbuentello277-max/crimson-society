import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createAdminServiceClient } from "@/lib/admin-api";
import { cleanupExpiredMerchReservations } from "@/lib/shop/reservation-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runExpire(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminServiceClient();
    const cleanup = await cleanupExpiredMerchReservations(admin);

    return NextResponse.json({
      ok: true,
      released_count: cleanup.released_count,
      cancelled_order_count: cleanup.cancelled_order_count,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Expire reservations failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return runExpire(request);
}

export async function POST(request: Request) {
  return runExpire(request);
}
