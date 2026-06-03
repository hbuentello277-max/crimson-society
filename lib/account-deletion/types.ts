export type DeletionRequestStatus = "pending" | "reviewing" | "completed" | "canceled";

export type AccountDeletionRequestRow = {
  id: string;
  user_id: string;
  status: DeletionRequestStatus | string;
  details: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  signed_out_at?: string | null;
  previous_status?: string | null;
  completion_log?: Record<string, unknown> | null;
  completed_at?: string | null;
};

export const OPEN_DELETION_STATUSES: DeletionRequestStatus[] = ["pending", "reviewing"];

export function isOpenDeletionStatus(status: string | null | undefined) {
  return OPEN_DELETION_STATUSES.includes((status || "pending") as DeletionRequestStatus);
}

export function isDeletionPendingProfile(status: string | null | undefined) {
  return status === "deletion_pending";
}

/** Paths a deletion_pending user may visit (prefix match). */
export const DELETION_PENDING_ALLOWED_PATHS = [
  "/deletion-pending",
  "/account-deletion",
  "/privacy",
  "/support",
  "/login",
  "/auth/callback",
] as const;

export function isPathAllowedDuringDeletionPending(pathname: string) {
  return DELETION_PENDING_ALLOWED_PATHS.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
}

export function deletionStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "pending":
      return "Pending admin approval";
    case "reviewing":
      return "Under review";
    case "completed":
      return "Completed — account deleted";
    case "canceled":
      return "Canceled";
    case "rejected":
      return "Rejected by admin";
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
        ? `Deletion requested on ${requested}. You are signed out and your account is pending admin approval. You may cancel this request after signing back in.`
        : "Your deletion request is pending admin approval. Sign in to view status or cancel.";
    case "reviewing":
      return "Your deletion request is under admin review.";
    case "completed":
      return request.reviewed_at
        ? `Deletion was completed on ${new Date(request.reviewed_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}. Your account and personal content have been removed. Safety records may be retained as described in our Privacy Policy.`
        : "Your account deletion was completed.";
    case "canceled":
      return "Your deletion request was canceled. You can use Crimson Society again with your existing account.";
    default:
      return null;
  }
}
