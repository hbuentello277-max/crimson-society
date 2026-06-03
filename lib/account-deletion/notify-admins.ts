import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminDeletionNotificationKind =
  | "account_deletion_requested"
  | "account_deletion_canceled"
  | "account_deletion_approved";

type NotifyAdminsInput = {
  actorUserId: string;
  username: string | null;
  kind: AdminDeletionNotificationKind;
  requestId?: string;
};

function notificationCopy(kind: AdminDeletionNotificationKind, username: string) {
  const handle = username.startsWith("@") ? username : `@${username}`;

  switch (kind) {
    case "account_deletion_requested":
      return {
        title: "Account deletion requested",
        body: `User ${handle} submitted an account deletion request.`,
      };
    case "account_deletion_canceled":
      return {
        title: "Account deletion canceled",
        body: `User ${handle} cancelled their account deletion request.`,
      };
    case "account_deletion_approved":
      return {
        title: "Account deletion approved",
        body: `Account deletion was approved for ${handle}.`,
      };
  }
}

function adminDeletionTargetUrl(requestId?: string) {
  const params = new URLSearchParams({ section: "deletion" });
  if (requestId) {
    params.set("request", requestId);
  }
  return `/admin?${params.toString()}`;
}

export async function notifyAdminsAccountDeletion(
  adminClient: SupabaseClient,
  input: NotifyAdminsInput,
) {
  const { data: admins, error: adminsError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("status", "active")
    .or("is_admin.eq.true,role.eq.admin");

  if (adminsError) {
    console.error("Failed to load admin profiles for deletion notification:", adminsError);
    return;
  }

  const adminIds = (admins || [])
    .map((row) => row.id as string)
    .filter((id) => id && id !== input.actorUserId);

  if (adminIds.length === 0) {
    return;
  }

  const username = input.username?.trim().replace(/^@+/, "") || "member";
  const copy = notificationCopy(input.kind, username);
  const targetUrl = adminDeletionTargetUrl(input.requestId);

  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: recentRows } = await adminClient
    .from("notifications")
    .select("id, user_id")
    .eq("type", input.kind)
    .eq("actor_id", input.actorUserId)
    .gte("created_at", since);

  const alreadyNotified = new Set(
    ((recentRows || []) as { user_id: string }[]).map((row) => row.user_id),
  );

  const rows = adminIds
    .filter((adminId) => !alreadyNotified.has(adminId))
    .map((adminId) => ({
      user_id: adminId,
      type: input.kind,
      title: copy.title,
      body: copy.body,
      actor_id: input.actorUserId,
      deletion_request_id: input.requestId ?? null,
      target_url: targetUrl,
    }));

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await adminClient.from("notifications").insert(rows);

  if (insertError) {
    console.error("Failed to insert admin deletion notifications:", insertError);
  }
}
