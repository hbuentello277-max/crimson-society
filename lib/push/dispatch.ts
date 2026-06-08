import { createClient } from "@supabase/supabase-js";
import {
  notificationDestination,
  notificationSummary,
  type NotificationActor,
  type NotificationItem,
  type NotificationType,
} from "@/lib/notifications";
import { isFcmServerConfigured, isInvalidFcmTokenError, sendFcmToToken } from "@/lib/push/fcm-server";

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin credentials for push dispatch.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

type NotificationRow = NotificationItem & {
  user_id: string;
  conversation_id: string | null;
};

type PushJobRow = {
  id: string;
  status: string;
};

async function loadActor(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  actorId: string | null,
): Promise<NotificationActor | null> {
  if (!actorId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, full_name, profile_image_url, avatar_url")
    .eq("id", actorId)
    .maybeSingle();

  return (data as NotificationActor | null) ?? null;
}

function buildPushUrl(
  notification: NotificationRow,
  actor: NotificationActor | null,
  appOrigin: string,
) {
  const path = notificationDestination(
    {
      type: notification.type,
      ride_id: notification.ride_id,
      conversation_id: notification.conversation_id,
      post_id: notification.post_id,
      comment_id: notification.comment_id,
      deletion_request_id: notification.deletion_request_id,
      target_url: notification.target_url,
    },
    actor,
  );

  return `${appOrigin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function dispatchPushForNotification(notificationId: string) {
  if (!isFcmServerConfigured()) {
    return { sent: 0, skipped: true, reason: "fcm_not_configured" as const };
  }

  const supabase = getSupabaseAdmin();
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "https://crimson-society.com";
  const now = new Date().toISOString();

  const { data: claimedJob, error: claimError } = await supabase
    .from("push_notification_jobs")
    .update({
      status: "processing",
      attempt_count: 1,
      last_error: null,
      processed_at: null,
    })
    .eq("notification_id", notificationId)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (claimError) {
    throw new Error(claimError.message);
  }

  if (!claimedJob) {
    const { data: existingJob } = await supabase
      .from("push_notification_jobs")
      .select("id, status")
      .eq("notification_id", notificationId)
      .maybeSingle();

    return {
      sent: 0,
      skipped: true,
      reason:
        existingJob?.status === "sent"
          ? ("already_sent" as const)
          : existingJob?.status === "processing"
            ? ("already_processing" as const)
            : ("not_pending" as const),
    };
  }

  const job = claimedJob as PushJobRow;

  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .select(
      "id, user_id, type, title, body, ride_id, conversation_id, post_id, comment_id, deletion_request_id, target_url, actor_id, read_at, created_at",
    )
    .eq("id", notificationId)
    .maybeSingle();

  if (notificationError || !notification) {
    await supabase
      .from("push_notification_jobs")
      .update({
        status: "failed",
        processed_at: new Date().toISOString(),
        last_error: notificationError?.message || "Notification not found.",
      })
      .eq("id", job.id);
    throw new Error(notificationError?.message || "Notification not found.");
  }

  const row = notification as NotificationRow;

  const { data: profile } = await supabase
    .from("profiles")
    .select("push_notifications_enabled")
    .eq("id", row.user_id)
    .maybeSingle();

  if (profile?.push_notifications_enabled === false) {
    await supabase
      .from("push_notification_jobs")
      .update({
        status: "skipped",
        processed_at: now,
        last_error: "push_disabled",
        sent_count: 0,
      })
      .eq("id", job.id);

    return { sent: 0, skipped: true, reason: "push_disabled" as const };
  }

  const { data: tokens, error: tokensError } = await supabase
    .from("user_push_tokens")
    .select("id, token")
    .eq("user_id", row.user_id)
    .eq("enabled", true);

  if (tokensError) {
    throw new Error(tokensError.message);
  }

  if (!tokens || tokens.length === 0) {
    await supabase
      .from("push_notification_jobs")
      .update({
        status: "skipped",
        processed_at: now,
        last_error: "no_tokens",
        sent_count: 0,
      })
      .eq("id", job.id);

    return { sent: 0, skipped: true, reason: "no_tokens" as const };
  }

  const actor = await loadActor(supabase, row.actor_id);
  const title = row.title || "Crimson Society";
  const body =
    notificationSummary(row, actor) || row.body || "You have new activity in Crimson Society.";
  const url = buildPushUrl(row, actor, appOrigin);

  let sent = 0;
  const invalidTokenIds: string[] = [];

  for (const device of tokens) {
    try {
      await sendFcmToToken(device.token, {
        title,
        body,
        url,
        notificationId: row.id,
        type: row.type as NotificationType,
        rideId: row.ride_id,
        conversationId: row.conversation_id,
      });
      sent += 1;
    } catch (error) {
      if (isInvalidFcmTokenError(error)) {
        invalidTokenIds.push(device.id);
        continue;
      }

      await supabase
        .from("push_notification_jobs")
        .update({
          status: "failed",
          processed_at: new Date().toISOString(),
          last_error: error instanceof Error ? error.message : "send_failed",
          sent_count: sent,
        })
        .eq("id", job.id);

      throw error;
    }
  }

  if (invalidTokenIds.length > 0) {
    await supabase
      .from("user_push_tokens")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .in("id", invalidTokenIds);
  }

  await supabase
    .from("push_notification_jobs")
    .update({
      status: sent > 0 ? "sent" : "skipped",
      processed_at: new Date().toISOString(),
      last_error: sent > 0 ? null : "no_deliverable_tokens",
      sent_count: sent,
    })
    .eq("id", job.id);

  return { sent, skipped: sent === 0, reason: sent === 0 ? ("no_deliverable_tokens" as const) : null };
}

export async function processPendingPushJobs(limit = 25) {
  const supabase = getSupabaseAdmin();

  const { data: jobs, error } = await supabase
    .from("push_notification_jobs")
    .select("notification_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const results = [];
  for (const job of jobs || []) {
    results.push(await dispatchPushForNotification(job.notification_id as string));
  }

  return results;
}
