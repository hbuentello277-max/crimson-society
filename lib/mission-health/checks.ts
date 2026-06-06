import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildMissionCheckResult,
  countAuthUsersSince,
  countRowsSince,
  evaluateActivityCheck,
  evaluateThresholdStatus,
  timedCheck,
  windowStartIso,
} from "@/lib/mission-health/check-utils";
import type { MissionCheckResult } from "@/lib/mission-health/types";
import {
  getMissionWorkflowDefinition,
  MISSION_WORKFLOW_SLUGS,
  type MissionWorkflowDefinition,
} from "@/lib/mission-health/workflows";

type MissionCheckRunner = (
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
) => Promise<MissionCheckResult>;

async function checkUserSignup(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(() =>
    countRowsSince(admin, "profiles", since, { timestampColumn: "created_at" }),
  );

  return {
    ...evaluateActivityCheck({
      definition,
      count: result.count,
      error: result.error,
      signal: "profiles_created",
      check_method: "db_signal",
    }),
    latency_ms,
  };
}

async function checkUserLogin(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(() =>
    countAuthUsersSince(admin, "last_sign_in_at", since),
  );

  return {
    ...evaluateActivityCheck({
      definition,
      count: result.count,
      error: result.error,
      signal: "auth_last_sign_in",
      check_method: "event_rate",
      extraDetails: { source_table: "auth.users" },
    }),
    latency_ms,
  };
}

async function checkProfileSetup(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(async () => {
    const { count, error } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", since)
      .not("username", "is", null)
      .neq("username", "");

    return { count, error: error?.message ?? null };
  });

  return {
    ...evaluateActivityCheck({
      definition,
      count: result.count,
      error: result.error,
      signal: "profiles_with_username_updated",
      check_method: "db_signal",
    }),
    latency_ms,
  };
}

async function checkPostCreation(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(() =>
    countRowsSince(admin, "Posts", since, { timestampColumn: "created_at" }),
  );

  return {
    ...evaluateActivityCheck({
      definition,
      count: result.count,
      error: result.error,
      signal: "posts_created",
      check_method: "db_signal",
    }),
    latency_ms,
  };
}

async function checkMeetCreation(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(() =>
    countRowsSince(admin, "rides", since, { timestampColumn: "created_at" }),
  );

  return {
    ...evaluateActivityCheck({
      definition,
      count: result.count,
      error: result.error,
      signal: "rides_created",
      check_method: "db_signal",
    }),
    latency_ms,
  };
}

async function checkMeetJoining(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(() =>
    countRowsSince(admin, "ride_attendees", since, { timestampColumn: "created_at" }),
  );

  return {
    ...evaluateActivityCheck({
      definition,
      count: result.count,
      error: result.error,
      signal: "ride_attendees_created",
      check_method: "db_signal",
    }),
    latency_ms,
  };
}

async function checkMessaging(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(() =>
    countRowsSince(admin, "messages", since, { timestampColumn: "created_at" }),
  );

  return {
    ...evaluateActivityCheck({
      definition,
      count: result.count,
      error: result.error,
      signal: "messages_created",
      check_method: "event_rate",
    }),
    latency_ms,
  };
}

async function checkBlackcardPurchase(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(async () => {
    const { count, error } = await admin
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since)
      .in("status", ["active", "trialing"]);

    return { count, error: error?.message ?? null };
  });

  return {
    ...evaluateActivityCheck({
      definition,
      count: result.count,
      error: result.error,
      signal: "active_subscriptions_created",
      check_method: "db_signal",
      extraDetails: { statuses: ["active", "trialing"] },
    }),
    latency_ms,
  };
}

async function checkStripeWebhookProcessing(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(async () => {
    const [processed, failed, processing] = await Promise.all([
      countRowsSince(admin, "stripe_webhook_events", since, {
        timestampColumn: "received_at",
        filters: [{ column: "status", op: "eq", value: "processed" }],
      }),
      countRowsSince(admin, "stripe_webhook_events", since, {
        timestampColumn: "received_at",
        filters: [{ column: "status", op: "eq", value: "failed" }],
      }),
      countRowsSince(admin, "stripe_webhook_events", since, {
        timestampColumn: "received_at",
        filters: [{ column: "status", op: "eq", value: "processing" }],
      }),
    ]);

    const error = processed.error ?? failed.error ?? processing.error;
    return {
      processed_count: processed.count,
      failed_count: failed.count,
      processing_count: processing.count,
      error,
    };
  });

  if (result.error) {
    return {
      ...buildMissionCheckResult({
        workflow_slug: definition.slug,
        status: "fail",
        check_method: "event_rate",
        details: {
          signal: "stripe_webhook_events",
          table_accessible: false,
          error: result.error,
        },
      }),
      latency_ms,
    };
  }

  const failedCount = result.failed_count ?? 0;
  const status = evaluateThresholdStatus({
    mode: definition.threshold_mode,
    value: failedCount,
    warning_threshold: definition.warning_threshold,
    critical_threshold: definition.critical_threshold,
  });

  return {
    ...buildMissionCheckResult({
      workflow_slug: definition.slug,
      status,
      check_method: "event_rate",
      details: {
        signal: "stripe_webhook_events",
        table_accessible: true,
        processed_count: result.processed_count ?? 0,
        failed_count: failedCount,
        processing_count: result.processing_count ?? 0,
        window_minutes: definition.activity_window_minutes,
        warning_threshold: definition.warning_threshold,
        critical_threshold: definition.critical_threshold,
      },
    }),
    latency_ms,
  };
}

async function checkPushNotificationDelivery(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const { result, latency_ms } = await timedCheck(async () => {
    const [pending, failed, sent] = await Promise.all([
      admin
        .from("push_notification_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      countRowsSince(admin, "push_notification_jobs", since, {
        filters: [{ column: "status", op: "eq", value: "failed" }],
      }),
      countRowsSince(admin, "push_notification_jobs", since, {
        filters: [{ column: "status", op: "eq", value: "sent" }],
      }),
    ]);

    return {
      pending_count: pending.count,
      failed_count: failed.count,
      sent_count: sent.count,
      error: pending.error?.message ?? failed.error ?? sent.error,
    };
  });

  if (result.error) {
    return {
      ...buildMissionCheckResult({
        workflow_slug: definition.slug,
        status: "fail",
        check_method: "db_signal",
        details: {
          signal: "push_notification_jobs",
          table_accessible: false,
          error: result.error,
        },
      }),
      latency_ms,
    };
  }

  const pendingCount = result.pending_count ?? 0;
  const status = evaluateThresholdStatus({
    mode: definition.threshold_mode,
    value: pendingCount,
    warning_threshold: definition.warning_threshold,
    critical_threshold: definition.critical_threshold,
  });

  return {
    ...buildMissionCheckResult({
      workflow_slug: definition.slug,
      status,
      check_method: "db_signal",
      details: {
        signal: "push_notification_jobs",
        table_accessible: true,
        pending_count: pendingCount,
        failed_count: result.failed_count ?? 0,
        sent_count: result.sent_count ?? 0,
        window_minutes: definition.activity_window_minutes,
        warning_threshold: definition.warning_threshold,
        critical_threshold: definition.critical_threshold,
      },
    }),
    latency_ms,
  };
}

async function checkMediaUpload(
  admin: SupabaseClient,
  definition: MissionWorkflowDefinition,
): Promise<MissionCheckResult> {
  const since = windowStartIso(definition.activity_window_minutes);
  const staleBefore = windowStartIso(definition.activity_window_minutes * 2);
  const { result, latency_ms } = await timedCheck(async () => {
    const [failed, ready, queuedStale] = await Promise.all([
      countRowsSince(admin, "media_processing_jobs", since, {
        filters: [{ column: "status", op: "eq", value: "failed" }],
      }),
      countRowsSince(admin, "media_processing_jobs", since, {
        filters: [{ column: "status", op: "eq", value: "ready" }],
      }),
      countRowsSince(admin, "media_processing_jobs", staleBefore, {
        filters: [{ column: "status", op: "in", value: ["queued", "processing"] }],
      }),
    ]);

    const error = failed.error ?? ready.error ?? queuedStale.error;
    return {
      failed_count: failed.count,
      ready_count: ready.count,
      stale_queue_count: queuedStale.count,
      error,
    };
  });

  if (result.error) {
    return {
      ...buildMissionCheckResult({
        workflow_slug: definition.slug,
        status: "fail",
        check_method: "db_signal",
        details: {
          signal: "media_processing_jobs",
          table_accessible: false,
          error: result.error,
        },
      }),
      latency_ms,
    };
  }

  const failedCount = result.failed_count ?? 0;
  let status = evaluateThresholdStatus({
    mode: definition.threshold_mode,
    value: failedCount,
    warning_threshold: definition.warning_threshold,
    critical_threshold: definition.critical_threshold,
  });

  const staleQueue = result.stale_queue_count ?? 0;
  if (staleQueue > 0 && status === "pass") {
    status = staleQueue >= definition.warning_threshold ? "warn" : status;
  }

  return {
    ...buildMissionCheckResult({
      workflow_slug: definition.slug,
      status,
      check_method: "db_signal",
      details: {
        signal: "media_processing_jobs",
        table_accessible: true,
        failed_count: failedCount,
        ready_count: result.ready_count ?? 0,
        stale_queue_count: staleQueue,
        window_minutes: definition.activity_window_minutes,
        warning_threshold: definition.warning_threshold,
        critical_threshold: definition.critical_threshold,
      },
    }),
    latency_ms,
  };
}

const MISSION_CHECK_RUNNERS: Record<(typeof MISSION_WORKFLOW_SLUGS)[number], MissionCheckRunner> = {
  user_signup: checkUserSignup,
  user_login: checkUserLogin,
  profile_setup: checkProfileSetup,
  post_creation: checkPostCreation,
  meet_creation: checkMeetCreation,
  meet_joining: checkMeetJoining,
  messaging: checkMessaging,
  blackcard_purchase: checkBlackcardPurchase,
  stripe_webhook_processing: checkStripeWebhookProcessing,
  push_notification_delivery: checkPushNotificationDelivery,
  media_upload: checkMediaUpload,
};

export async function runMissionWorkflowCheck(
  admin: SupabaseClient,
  slug: (typeof MISSION_WORKFLOW_SLUGS)[number],
): Promise<MissionCheckResult> {
  const definition = getMissionWorkflowDefinition(slug);
  const runner = MISSION_CHECK_RUNNERS[slug];
  return runner(admin, definition);
}

export async function runAllMissionWorkflowChecks(
  admin: SupabaseClient,
): Promise<MissionCheckResult[]> {
  const results = await Promise.all(
    MISSION_WORKFLOW_SLUGS.map((slug) => runMissionWorkflowCheck(admin, slug)),
  );
  return results;
}
