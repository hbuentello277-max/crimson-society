import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";

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

  try {
    const adminClient = createAdminServiceClient();

    const { data: ride, error: rideError } = await adminClient
      .from("rides")
      .select("id, name")
      .eq("id", rideId)
      .maybeSingle();

    if (rideError) {
      return NextResponse.json({ error: rideError.message }, { status: 400 });
    }

    if (!ride) {
      return NextResponse.json({ error: "Meet not found." }, { status: 404 });
    }

    const { error: deleteError } = await adminClient.from("rides").delete().eq("id", rideId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      id: rideId,
      message: `Meet "${ride.name || "Untitled"}" was permanently deleted.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete meet.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
