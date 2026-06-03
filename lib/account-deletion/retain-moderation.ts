import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function snapshotModerationRecords(
  adminClient: SupabaseClient,
  userId: string,
): Promise<{ reportsSnapshotted: number }> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", userId)
    .maybeSingle();

  const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? null;

  const { data: asReporter } = await adminClient
    .from("user_reports")
    .select("id, reporter_id")
    .eq("reporter_id", userId);

  let reportsSnapshotted = 0;

  for (const report of asReporter ?? []) {
    const snapshot = {
      user_id: userId,
      username: profile?.username ?? null,
      display_name: profile?.display_name ?? null,
      email_hash: email ? hashEmail(email) : null,
      snapshotted_at: new Date().toISOString(),
    };

    const { error } = await adminClient
      .from("user_reports")
      .update({ reporter_snapshot: snapshot })
      .eq("id", report.id);

    if (!error) reportsSnapshotted += 1;
  }

  // Reports about this user keep reported_user_id until auth delete (SET NULL)
  return { reportsSnapshotted };
}

export function hashEmail(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export async function writeDeletionAudit(
  adminClient: SupabaseClient,
  input: {
    userId: string;
    deletionRequestId: string | null;
    adminId: string;
    username: string | null;
    email: string | null;
    requestedAt: string | null;
    stripeCustomerId: string | null;
    completionLog: Record<string, unknown>;
  },
) {
  const { error } = await adminClient.from("account_deletion_audit").insert({
    user_id: input.userId,
    deletion_request_id: input.deletionRequestId,
    admin_id: input.adminId,
    username_snapshot: input.username,
    email_hash: input.email ? hashEmail(input.email) : null,
    requested_at: input.requestedAt,
    completed_at: new Date().toISOString(),
    stripe_customer_id: input.stripeCustomerId,
    completion_log: input.completionLog,
  });

  if (error) {
    throw new Error(`Failed to write deletion audit: ${error.message}`);
  }
}
