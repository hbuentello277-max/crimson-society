import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api";

export async function DELETE(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rideId = body.id?.trim();
  if (!rideId) {
    return NextResponse.json({ error: "Meet id is required." }, { status: 400 });
  }

  const { data, error } = await auth.session.supabase.rpc("admin_delete_ride", {
    p_ride_id: rideId,
  });

  if (error) {
    const message = error.message || "Failed to delete meet.";
    const status = message.includes("not found") ? 404 : message.includes("Admins only") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const result = (data || {}) as { ok?: boolean; id?: string; name?: string };

  return NextResponse.json({
    ok: true,
    id: result.id || rideId,
    message: `Meet "${result.name || "Untitled"}" was permanently deleted.`,
  });
}
