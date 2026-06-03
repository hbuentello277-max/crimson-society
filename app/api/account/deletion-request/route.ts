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

  let body: { confirmation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.confirmation?.trim() !== "DELETE") {
    return NextResponse.json(
      { error: 'Type DELETE in the confirmation field to submit this request.' },
      { status: 400 },
    );
  }

  const { data: deletionRequest, error: rpcError } = await auth.supabase.rpc(
    "request_account_deletion",
    { p_confirmation: body.confirmation.trim() },
  );

  if (rpcError) {
    const message = rpcError.message || "Could not create deletion request.";
    const status =
      message.includes("already pending") || message.includes("already exists")
        ? 409
        : message.includes("Admin accounts")
          ? 403
          : message.includes("Profile not found")
            ? 404
            : 400;

    return NextResponse.json({ error: message }, { status });
  }

  const userId = auth.userId;
  const now = new Date().toISOString();

  try {
    const adminClient = createAdminServiceClient();
    const { error: authMetaError } = await adminClient.auth.admin.updateUserById(userId, {
      app_metadata: {
        deletion_pending: true,
        deletion_requested_at: now,
      },
    });

    if (authMetaError) {
      console.error("Failed to update auth metadata for deletion request:", authMetaError);
    }
  } catch (error) {
    console.error(
      "Service role unavailable for auth metadata update:",
      error instanceof Error ? error.message : error,
    );
  }

  return NextResponse.json({
    ok: true,
    request: deletionRequest,
    message: "Account deletion requested. You will be signed out now.",
  });
}
