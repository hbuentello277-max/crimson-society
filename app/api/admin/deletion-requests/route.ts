import { NextResponse } from "next/server";
import { executeAccountDeletion } from "@/lib/account-deletion/execute";
import { notifyAdminsAccountDeletion } from "@/lib/account-deletion/notify-admins";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { getMissingSupabaseAdminEnvVars } from "@/lib/supabase-admin-env";

const DELETION_STATUSES = ["reviewing", "completed", "rejected"] as const;
type DeletionStatus = (typeof DELETION_STATUSES)[number];

function isDeletionStatus(value: unknown): value is DeletionStatus {
  return typeof value === "string" && DELETION_STATUSES.includes(value as DeletionStatus);
}

function serviceRoleConfigError(error: unknown) {
  const missing = getMissingSupabaseAdminEnvVars();
  const message =
    error instanceof Error
      ? error.message
      : `Missing Supabase env var(s): ${missing.join(", ")}`;
  return NextResponse.json(
    {
      error: `${message}. Admin approval requires SUPABASE_SERVICE_ROLE_KEY on the server.`,
    },
    { status: 500 },
  );
}

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const adminClient = auth.session.supabase;
  const { data, error } = await adminClient
    .from("account_deletion_requests")
    .select(
      "id, user_id, status, details, requested_at, reviewed_at, reviewed_by, previous_status, completed_at",
    )
    .order("requested_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userIds = Array.from(
    new Set(
      (data || [])
        .flatMap((row) => [row.user_id, row.reviewed_by])
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const { data: profiles } = userIds.length
    ? await adminClient
        .from("profiles")
        .select("id, username, email, display_name, role, status")
        .in("id", userIds)
    : { data: [] as Record<string, unknown>[] };

  return NextResponse.json({
    requests: data || [],
    profiles: profiles || [],
  });
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
    let adminClient;
    try {
      adminClient = createAdminServiceClient();
    } catch (error) {
      return serviceRoleConfigError(error);
    }

    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await adminClient
      .from("account_deletion_requests")
      .select(
        "id, user_id, status, details, requested_at, reviewed_at, reviewed_by, previous_status",
      )
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: existingError?.message || "Deletion request not found." },
        { status: 404 },
      );
    }

    if (status === "completed") {
      if (!existing.user_id) {
        return NextResponse.json(
          { error: "Deletion request has no associated user." },
          { status: 400 },
        );
      }

      if (existing.status === "completed") {
        return NextResponse.json({ error: "Request is already completed." }, { status: 409 });
      }

      const { data: subjectProfile } = await adminClient
        .from("profiles")
        .select("username")
        .eq("id", existing.user_id)
        .maybeSingle();

      const execution = await executeAccountDeletion(
        adminClient,
        existing.user_id,
        auth.session.userId,
        existing.id,
      );

      if (!execution.ok) {
        await adminClient
          .from("account_deletion_requests")
          .update({
            status: "reviewing",
            completion_log: execution.steps,
            reviewed_at: now,
            reviewed_by: auth.session.userId,
          })
          .eq("id", id);

        return NextResponse.json(
          {
            error: execution.error || "Account deletion failed.",
            steps: execution.steps,
          },
          { status: 500 },
        );
      }

      const { data, error } = await adminClient
        .from("account_deletion_requests")
        .update({
          status: "completed",
          reviewed_at: now,
          reviewed_by: auth.session.userId,
          completed_at: now,
          completion_log: execution.steps,
        })
        .eq("id", id)
        .select(
          "id, user_id, status, details, requested_at, reviewed_at, reviewed_by, completed_at, completion_log",
        )
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (existing.user_id) {
        await notifyAdminsAccountDeletion(adminClient, {
          actorUserId: existing.user_id,
          username: subjectProfile?.username ?? null,
          kind: "account_deletion_approved",
          requestId: existing.id,
        });
      }

      return NextResponse.json({
        request: data,
        execution,
      });
    }

    if (status === "rejected" && existing.user_id) {
      const restoreStatus =
        typeof existing.previous_status === "string" && existing.previous_status.length > 0
          ? existing.previous_status
          : "active";

      await adminClient
        .from("profiles")
        .update({
          status: restoreStatus,
          hide_from_suggestions: false,
          hide_location_from_suggestions: false,
        })
        .eq("id", existing.user_id)
        .eq("status", "deletion_pending");

      await adminClient.auth.admin.updateUserById(existing.user_id, {
        app_metadata: { deletion_pending: false },
      });
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

    return NextResponse.json({ request: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update deletion request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
