import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addWarning,
  countTableRows,
  daysAgoIso,
  startOfUtcDayIso,
} from "@/lib/metrics/query-utils";
import type { ActivityMetrics } from "@/lib/metrics/types";

export async function collectActivityMetrics(admin: SupabaseClient): Promise<ActivityMetrics> {
  const warnings: ActivityMetrics["warnings"] = [];
  const todayStart = startOfUtcDayIso();
  const weekStart = daysAgoIso(7);

  const [
    postsToday,
    postsWeek,
    meetsToday,
    meetsWeek,
    messagesToday,
    messagesWeek,
    pushPending,
    pushSentToday,
    pushFailedToday,
    mediaToday,
    mediaWeek,
  ] = await Promise.all([
    countTableRows(admin, "Posts", { sinceIso: todayStart }),
    countTableRows(admin, "Posts", { sinceIso: weekStart }),
    countTableRows(admin, "rides", { sinceIso: todayStart }),
    countTableRows(admin, "rides", { sinceIso: weekStart }),
    countTableRows(admin, "messages", { sinceIso: todayStart }),
    countTableRows(admin, "messages", { sinceIso: weekStart }),
    countTableRows(admin, "push_notification_jobs", {
      filters: [{ column: "status", op: "eq", value: "pending" }],
    }),
    countTableRows(admin, "push_notification_jobs", {
      sinceIso: todayStart,
      filters: [{ column: "status", op: "eq", value: "sent" }],
    }),
    countTableRows(admin, "push_notification_jobs", {
      sinceIso: todayStart,
      filters: [{ column: "status", op: "eq", value: "failed" }],
    }),
    countTableRows(admin, "media_processing_jobs", { sinceIso: todayStart }),
    countTableRows(admin, "media_processing_jobs", { sinceIso: weekStart }),
  ]);

  const fieldMap: Array<[string, { count: number | null; error: string | null }]> = [
    ["Posts.today", postsToday],
    ["Posts.week", postsWeek],
    ["rides.today", meetsToday],
    ["rides.week", meetsWeek],
    ["messages.today", messagesToday],
    ["messages.week", messagesWeek],
    ["push_notification_jobs.pending", pushPending],
    ["push_notification_jobs.sent_today", pushSentToday],
    ["push_notification_jobs.failed_today", pushFailedToday],
    ["media_processing_jobs.today", mediaToday],
    ["media_processing_jobs.week", mediaWeek],
  ];

  for (const [field, result] of fieldMap) {
    if (result.error) {
      addWarning(warnings, field, result.error);
    }
  }

  return {
    posts_today: postsToday.error ? null : postsToday.count,
    posts_this_week: postsWeek.error ? null : postsWeek.count,
    meets_today: meetsToday.error ? null : meetsToday.count,
    meets_this_week: meetsWeek.error ? null : meetsWeek.count,
    messages_today: messagesToday.error ? null : messagesToday.count,
    messages_this_week: messagesWeek.error ? null : messagesWeek.count,
    push_pending: pushPending.error ? null : pushPending.count,
    push_sent_today: pushSentToday.error ? null : pushSentToday.count,
    push_failed_today: pushFailedToday.error ? null : pushFailedToday.count,
    media_uploads_today: mediaToday.error ? null : mediaToday.count,
    media_uploads_this_week: mediaWeek.error ? null : mediaWeek.count,
    warnings,
  };
}
