import { NextResponse } from "next/server";
import { createAdminServiceClient } from "@/lib/admin-api";
import { isOpenDeletionStatus } from "@/lib/account-deletion/types";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export async function POST(request: Request) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
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

  const userId = auth.userId;
  const adminClient = createAdminServiceClient();

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, status, role, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (profile.is_admin === true || profile.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted through this flow." },
      { status: 403 },
    );
  }

  if (profile.status === "deletion_pending") {
    return NextResponse.json(
      { error: "Account deletion is already pending." },
      { status: 409 },
    );
  }

  const { data: existingRequest } = await adminClient
    .from("account_deletion_requests")
    .select("id, status")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingRequest && isOpenDeletionStatus(existingRequest.status)) {
    return NextResponse.json(
      { error: "An open deletion request already exists." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const previousStatus = profile.status || "active";

  const { data: deletionRequest, error: insertError } = await adminClient
    .from("account_deletion_requests")
    .insert({
      user_id: userId,
      status: "pending",
      details: "Requested via in-app account deletion.",
      signed_out_at: now,
      previous_status: previousStatus,
    })
    .select("id, user_id, status, requested_at, signed_out_at, previous_status")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message || "Could not create deletion request." },
      { status: 400 },
    );
  }

  const { error: profileUpdateError } = await adminClient
    .from("profiles")
    .update({
      status: "deletion_pending",
      hide_from_suggestions: true,
      hide_location_from_suggestions: true,
    })
    .eq("id", userId);

  if (profileUpdateError) {
    return NextResponse.json(
      { error: profileUpdateError.message || "Could not update profile status." },
      { status: 500 },
    );
  }

  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      deletion_pending: true,
      deletion_requested_at: now,
    },
  });

  return NextResponse.json({
    ok: true,
    request: deletionRequest,
    message:
      "Account deletion requested. Sign out on this device to finish. Your account is pending admin approval.",
  });
}
