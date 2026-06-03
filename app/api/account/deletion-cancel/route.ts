import { NextResponse } from "next/server";
import { notifyAdminsAccountDeletion } from "@/lib/account-deletion/notify-admins";
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

  const userId = auth.userId;

  let adminClient;
  try {
    adminClient = createAdminServiceClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server configuration error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, status, username")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.status !== "deletion_pending") {
    return NextResponse.json(
      { error: "No pending account deletion to cancel." },
      { status: 400 },
    );
  }

  const { data: openRequest } = await adminClient
    .from("account_deletion_requests")
    .select("id, status, previous_status")
    .eq("user_id", userId)
    .in("status", ["pending", "reviewing"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!openRequest) {
    return NextResponse.json(
      { error: "No open deletion request found." },
      { status: 404 },
    );
  }

  if (openRequest.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending requests can be canceled by the account owner." },
      { status: 400 },
    );
  }

  const restoreStatus =
    typeof openRequest.previous_status === "string" && openRequest.previous_status.length > 0
      ? openRequest.previous_status
      : "active";

  const now = new Date().toISOString();

  const { error: requestError } = await adminClient
    .from("account_deletion_requests")
    .update({ status: "canceled", reviewed_at: now })
    .eq("id", openRequest.id);

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 400 });
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      status: restoreStatus,
      hide_from_suggestions: false,
      hide_location_from_suggestions: false,
    })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { deletion_pending: false },
  });

  await notifyAdminsAccountDeletion(adminClient, {
    actorUserId: userId,
    username: profile?.username ?? null,
    kind: "account_deletion_canceled",
    requestId: openRequest.id,
  });

  return NextResponse.json({
    ok: true,
    message: "Deletion request canceled. Your account is active again.",
    status: restoreStatus,
  });
}
