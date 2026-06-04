import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";

type AdjustDirection = "add" | "remove";

function isDirection(value: unknown): value is AdjustDirection {
  return value === "add" || value === "remove";
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: {
    user_id?: string;
    direction?: string;
    amount?: number;
    reason?: string;
    note?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user_id, direction, amount, reason, note } = body;

  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  if (!isDirection(direction)) {
    return NextResponse.json({ error: "direction must be add or remove" }, { status: 400 });
  }

  if (amount == null || !Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive integer" }, { status: 400 });
  }

  if (!reason || typeof reason !== "string" || reason.trim() === "") {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const signedAmount = direction === "add" ? amount : -amount;
  const metadata: Record<string, unknown> = {};
  if (note && typeof note === "string" && note.trim() !== "") {
    metadata.note = note.trim();
  }

  try {
    const adminClient = createAdminServiceClient();

    const { data, error } = await adminClient.rpc("admin_adjust_crimson_credits", {
      p_target_user_id: user_id,
      p_amount: signedAmount,
      p_reason: reason.trim(),
      p_admin_id: auth.session.userId,
      p_metadata: metadata,
    });

    if (error) {
      const status = error.message.includes("Cannot remove more") ? 400 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ result: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to adjust credits.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
