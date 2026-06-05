import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body: { reservationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reservationId = body.reservationId?.trim();
  if (!reservationId) {
    return NextResponse.json({ error: "reservationId is required" }, { status: 400 });
  }

  const admin = createAdminServiceClient();
  const { data: reservation, error: loadError } = await admin
    .from("product_inventory_reservations")
    .select("id, user_id, status")
    .eq("id", reservationId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.user_id !== auth.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin.rpc("product_inventory_release_reservation", {
    p_reservation_id: reservationId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
