import type { SupabaseClient } from "@supabase/supabase-js";

export type DeletionRequestStatus = "pending" | "reviewing" | "completed" | "canceled";

export type AccountDeletionRequestRow = {
  id: string;
  user_id: string;
  status: DeletionRequestStatus | string;
  details: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export const OPEN_DELETION_STATUSES: DeletionRequestStatus[] = ["pending", "reviewing"];

export function isOpenDeletionStatus(status: string | null | undefined) {
  return OPEN_DELETION_STATUSES.includes((status || "pending") as DeletionRequestStatus);
}

export function deletionStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "pending":
      return "Pending admin review";
    case "reviewing":
      return "Under review";
    case "completed":
      return "Completed — account access disabled";
    case "canceled":
      return "Canceled";
    default:
      return status || "Unknown";
  }
}

export function deletionStatusUserMessage(
  request: Pick<AccountDeletionRequestRow, "status" | "requested_at" | "reviewed_at">,
) {
  const requested = request.requested_at
    ? new Date(request.requested_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  switch (request.status) {
    case "pending":
      return requested
        ? `Deletion requested on ${requested}. Your account is pending admin review. You can cancel this request while it is pending.`
        : "Your deletion request is pending admin review. You can cancel while it remains pending.";
    case "reviewing":
      return "Your deletion request is under admin review. Access may remain available until review is finished.";
    case "completed":
      return request.reviewed_at
        ? `Deletion completed on ${new Date(request.reviewed_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}. Account access is disabled. Some records may be retained for safety and legal compliance.`
        : "Your deletion request was completed. Account access is disabled.";
    case "canceled":
      return "Your previous deletion request was canceled. You may submit a new request if needed.";
    default:
      return null;
  }
}

/** Disables app access when an admin completes a deletion request. Does not purge user content. */
export async function applyDeletionCompletion(
  adminClient: SupabaseClient,
  userId: string,
) {
  const now = new Date().toISOString();

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ status: "blocked" })
    .eq("id", userId);

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  return {
    profileDisabled: !profileError,
    profileError: profileError?.message ?? null,
    authBanned: !authError,
    authError: authError?.message ?? null,
    completedAt: now,
  };
}
