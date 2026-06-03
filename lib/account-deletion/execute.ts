import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelUserStripeSubscriptions } from "@/lib/stripe/cancel-user-subscriptions";
import { purgeUserGeneratedContent } from "@/lib/account-deletion/purge-content";
import {
  hashEmail,
  snapshotModerationRecords,
  writeDeletionAudit,
} from "@/lib/account-deletion/retain-moderation";

export type DeletionExecutionResult = {
  ok: boolean;
  steps: Record<string, unknown>;
  error?: string;
};

export async function executeAccountDeletion(
  adminClient: SupabaseClient,
  userId: string,
  adminId: string,
  deletionRequestId: string | null,
): Promise<DeletionExecutionResult> {
  const steps: Record<string, unknown> = {};

  const { data: profile, error: profileLoadError } = await adminClient
    .from("profiles")
    .select("id, username, display_name, role, is_admin, status")
    .eq("id", userId)
    .maybeSingle();

  if (profileLoadError || !profile) {
    return {
      ok: false,
      steps,
      error: profileLoadError?.message || "Profile not found.",
    };
  }

  if (profile.is_admin === true || profile.role === "admin") {
    return { ok: false, steps, error: "Admin accounts cannot be deleted through this workflow." };
  }

  const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? null;

  const { data: requestRow } = deletionRequestId
    ? await adminClient
        .from("account_deletion_requests")
        .select("requested_at")
        .eq("id", deletionRequestId)
        .maybeSingle()
    : { data: null };

  // 1. Stripe — must succeed before any destructive step
  const stripeResult = await cancelUserStripeSubscriptions(adminClient, userId);
  steps.stripe = stripeResult;

  if (!stripeResult.ok) {
    return {
      ok: false,
      steps,
      error: `Stripe cancellation failed: ${stripeResult.errors.join("; ")}`,
    };
  }

  // 2. Membership flags
  await adminClient
    .from("profiles")
    .update({
      membership_status: "inactive",
      membership_tier: null,
    })
    .eq("id", userId);

  steps.membership = { cleared: true };

  // 3. Moderation snapshots (before content purge)
  const moderation = await snapshotModerationRecords(adminClient, userId);
  steps.moderation = moderation;

  // 4. Hard-delete UGC + storage
  const purgeLog = await purgeUserGeneratedContent(adminClient, userId);
  steps.purge = purgeLog;

  // 5. Stripe customer mapping (subscriptions already canceled)
  const { data: customerRow } = await adminClient
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  await adminClient.from("stripe_customers").delete().eq("user_id", userId);
  await adminClient.from("subscriptions").delete().eq("user_id", userId);

  // 6. Audit row before auth delete
  await writeDeletionAudit(adminClient, {
    userId,
    deletionRequestId,
    adminId,
    username: profile.username ?? null,
    email,
    requestedAt: requestRow?.requested_at ?? null,
    stripeCustomerId: (customerRow?.stripe_customer_id as string) ?? null,
    completionLog: steps,
  });

  steps.audit = { written: true };

  // 7. Mark profile deleted (briefly, before cascade)
  await adminClient
    .from("profiles")
    .update({
      status: "deleted",
      display_name: "Deleted Account",
      full_name: null,
      username: `deleted_${userId.slice(0, 8)}`,
      bio: null,
      quote: null,
      avatar_url: null,
      profile_image_url: null,
      location: null,
      city: null,
      state: null,
      riding_area: null,
      instagram_url: null,
      tiktok_url: null,
      youtube_url: null,
      website_url: null,
      hide_from_suggestions: true,
    })
    .eq("id", userId);

  // 8. Delete Supabase Auth user (cascades profile and linked rows)
  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
  steps.auth = {
    deleted: !authDeleteError,
    error: authDeleteError?.message ?? null,
    emailHash: email ? hashEmail(email) : null,
  };

  if (authDeleteError) {
    return {
      ok: false,
      steps,
      error: authDeleteError.message,
    };
  }

  return { ok: true, steps };
}
