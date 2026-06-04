import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { isRedemptionStatus } from "@/lib/credits/admin-rewards-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  let body: { status?: string; fulfillment_notes?: string; cancel_reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.status || !isRedemptionStatus(body.status)) {
    return NextResponse.json(
      { error: "status must be pending, approved, fulfilled, or cancelled" },
      { status: 400 },
    );
  }

  const admin = createAdminServiceClient();

  const { data, error } = await admin.rpc("admin_update_crimson_credit_redemption", {
    p_redemption_id: id,
    p_status: body.status,
    p_admin_id: auth.session.userId,
    p_fulfillment_notes: body.fulfillment_notes ?? null,
    p_cancel_reason: body.cancel_reason ?? null,
  });

  if (error) {
    const message = error.message || "Could not update redemption.";
    const status = message.toLowerCase().includes("forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const { data: row, error: fetchError } = await admin
    .from("crimson_credit_redemptions")
    .select(
      "id, status, fulfillment_notes, refund_transaction_id, cancelled_at, status_updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    result: data,
    redemption: row,
  });
}
