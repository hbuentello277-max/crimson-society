import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, authDetail: auth.authDetail },
      { status: 401 },
    );
  }

  const { data, error: rpcError } = await auth.supabase.rpc("cancel_account_deletion_request");

  if (rpcError) {
    const message = rpcError.message || "Could not cancel deletion request.";
    const status =
      message.includes("No pending") || message.includes("No open")
        ? message.includes("No open")
          ? 404
          : 400
        : 400;

    return NextResponse.json({ error: message }, { status });
  }

  const result = (data || {}) as { status?: string; request_id?: string };

  try {
    const adminClient = createAdminServiceClient();
    await adminClient.auth.admin.updateUserById(auth.userId, {
      app_metadata: { deletion_pending: false },
    });
  } catch (error) {
    console.error(
      "Service role unavailable for auth metadata update:",
      error instanceof Error ? error.message : error,
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Deletion request canceled. Your account is active again.",
    status: result.status || "active",
  });
}
