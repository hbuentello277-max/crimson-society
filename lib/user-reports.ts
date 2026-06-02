import { supabase } from "@/lib/supabase";

export const DEFAULT_REPORT_REASONS = [
  "Harassment or abuse",
  "Spam or scam",
  "Impersonation",
  "Unsafe behavior",
  "Hate or discrimination",
  "Other",
] as const;

export const MEET_REPORT_REASONS = [
  "Unsafe riding or meet behavior",
  "Harassment or abuse",
  "Spam or scam",
  "Impersonation",
  "Other",
] as const;

export type UserReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

export type UserReportTargetType = "user" | "meet" | "post" | "message";

export type UserReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  ride_id: string | null;
  post_id: string | null;
  message_id: string | null;
  conversation_id: string | null;
  reason: string;
  details: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function getUserReportTargetType(report: {
  post_id?: string | null;
  message_id?: string | null;
  conversation_id?: string | null;
  ride_id?: string | null;
  reported_user_id?: string | null;
}): UserReportTargetType {
  if (report.post_id) return "post";
  if (report.message_id || report.conversation_id) return "message";
  if (report.ride_id) return "meet";
  return "user";
}

export function userReportTargetLabel(type: UserReportTargetType) {
  switch (type) {
    case "post":
      return "Post";
    case "message":
      return "Message";
    case "meet":
      return "Meet";
    default:
      return "User";
  }
}

export type SubmitUserReportInput = {
  reporterId: string;
  reason: string;
  details?: string | null;
  reportedUserId?: string | null;
  rideId?: string | null;
  postId?: string | null;
  messageId?: string | null;
  conversationId?: string | null;
};

export async function submitUserReport(input: SubmitUserReportInput) {
  const {
    reporterId,
    reason,
    details,
    reportedUserId,
    rideId,
    postId,
    messageId,
    conversationId,
  } = input;

  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return { error: new Error("A report reason is required.") };
  }

  if (reportedUserId && reportedUserId === reporterId) {
    return { error: new Error("You cannot report yourself.") };
  }

  const hasTarget = Boolean(
    reportedUserId || rideId || postId || messageId || conversationId,
  );

  if (!hasTarget) {
    return { error: new Error("Report target is missing.") };
  }

  const { error } = await supabase.from("user_reports").insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId ?? null,
    ride_id: rideId ?? null,
    post_id: postId ?? null,
    message_id: messageId ?? null,
    conversation_id: conversationId ?? null,
    reason: trimmedReason,
    details: details?.trim() || null,
    status: "pending",
  });

  if (error) {
    return { error: new Error(error.message || "Could not submit report.") };
  }

  return { error: null };
}
