import { NextResponse } from "next/server";
import { applyDeletionCompletion } from "@/lib/account-deletion";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";

const DELETION_STATUSES = ["reviewing", "completed", "canceled"] as const;
type DeletionStatus = (typeof DELETION_STATUSES)[number];

function isDeletionStatus(value: unknown): value is DeletionStatus {
  return typeof value === "string" && DELETION_STATUSES.includes(value as DeletionStatus);
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { id?: string; status?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, status } = body;

  if (!id || !isDeletionStatus(status)) {
    return NextResponse.json(
      { error: "Invalid account deletion update payload." },
      { status: 400 },
    );
  }

  try {
    const adminClient = createAdminServiceClient();
    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await adminClient
      .from("account_deletion_requests")
      .select("id, user_id, status, details, requested_at, reviewed_at, reviewed_by")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: existingError?.message || "Deletion request not found." },
        { status: 404 },
      );
    }

    const { data, error } = await adminClient
      .from("account_deletion_requests")
      .update({
        status,
        reviewed_at: now,
        reviewed_by: auth.session.userId,
      })
      .eq("id", id)
      .select("id, user_id, status, details, requested_at, reviewed_at, reviewed_by")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    let completion: Awaited<ReturnType<typeof applyDeletionCompletion>> | null = null;

    if (status === "completed" && existing.user_id) {
      completion = await applyDeletionCompletion(adminClient, existing.user_id);
    }

    return NextResponse.json({
      request: data,
      completion,
      manualFollowUp:
        status === "completed"
          ? [
              "Auth user is banned and profile status is blocked; sign-in is disabled.",
              "Posts, messages, meets, reports, and moderation records are not automatically purged.",
              "Full auth user removal and content erasure still require a separate manual admin process if required by law.",
            ]
          : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update deletion request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
