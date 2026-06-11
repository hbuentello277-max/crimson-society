import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/lib/notifications";

export const MEET_ALERT_TYPES: NotificationType[] = [
  "meet_joined",
  "meet_left",
  "meet_removed",
  "meet_canceled",
  "meet_cancelled",
  "meet_updated",
  "meet_ended",
  "meet_reminder",
  "host_meet_created",
  "favorite_rider_meet",
  "favorite_rider_ride_started",
];

const PROFILE_ALERT_TYPES: NotificationType[] = [
  "profile_followed",
  "follow",
  "post_liked",
  "post_like",
  "post_commented",
  "post_comment",
  "connection_accepted",
  "crimson_credits_reward",
  "favorite_rider_post",
];

type NavBadgeCountsRow = {
  unread_messages_count: number | string | null;
  unread_notifications_count: number | string | null;
  unread_meet_chat_count: number | string | null;
  total_badge_count: number | string | null;
};

export type NavBadgeCounts = {
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  unreadMeetChatCount: number;
  totalBadgeCount: number;
};

const EMPTY_NAV_BADGE_COUNTS: NavBadgeCounts = {
  unreadMessagesCount: 0,
  unreadNotificationsCount: 0,
  unreadMeetChatCount: 0,
  totalBadgeCount: 0,
};

function toCount(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapNavBadgeCountsRow(row: NavBadgeCountsRow | null | undefined): NavBadgeCounts {
  if (!row) return EMPTY_NAV_BADGE_COUNTS;

  const unreadMessagesCount = toCount(row.unread_messages_count);
  const unreadNotificationsCount = toCount(row.unread_notifications_count);
  const unreadMeetChatCount = toCount(row.unread_meet_chat_count);
  const totalBadgeCount = toCount(row.total_badge_count);

  return {
    unreadMessagesCount,
    unreadNotificationsCount,
    unreadMeetChatCount,
    totalBadgeCount:
      totalBadgeCount > 0
        ? totalBadgeCount
        : unreadMessagesCount + unreadNotificationsCount + unreadMeetChatCount,
  };
}

export async function loadNavBadgeCounts(admin: SupabaseClient): Promise<NavBadgeCounts> {
  const { data, error } = await admin.rpc("get_nav_badge_counts");

  if (error) {
    console.error("Failed to load nav badge counts:", error);
    return EMPTY_NAV_BADGE_COUNTS;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return mapNavBadgeCountsRow(row as NavBadgeCountsRow | undefined);
}

export async function loadMeetChatUnreadCountsByRide(
  admin: SupabaseClient,
  rideIds: string[],
): Promise<Record<string, number>> {
  const uniqueRideIds = Array.from(new Set(rideIds.filter(Boolean)));
  if (uniqueRideIds.length === 0) return {};

  const { data, error } = await admin.rpc("get_meet_chat_unread_counts", {
    p_ride_ids: uniqueRideIds,
  });

  if (error) {
    console.error("Failed to load meet chat unread counts:", error);
    return Object.fromEntries(uniqueRideIds.map((rideId) => [rideId, 0]));
  }

  const counts = Object.fromEntries(uniqueRideIds.map((rideId) => [rideId, 0]));
  for (const row of (data || []) as Array<{ ride_id: string; unread_count: number | string | null }>) {
    counts[row.ride_id] = toCount(row.unread_count);
  }

  return counts;
}

export async function countUnreadNotificationsByTypes(
  admin: SupabaseClient,
  userId: string,
  types: NotificationType[],
) {
  if (types.length === 0) return 0;

  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)
    .in("type", types);

  if (error) {
    console.error("Failed to count typed notifications:", error);
    return 0;
  }

  return count || 0;
}

export async function loadMeetChatUnreadTotal(admin: SupabaseClient, _userId: string) {
  const counts = await loadNavBadgeCounts(admin);
  return counts.unreadMeetChatCount;
}

export async function loadMeetNavBadgeCount(admin: SupabaseClient, userId: string) {
  const [counts, meetAlerts] = await Promise.all([
    loadNavBadgeCounts(admin),
    countUnreadNotificationsByTypes(admin, userId, MEET_ALERT_TYPES),
  ]);

  return counts.unreadMeetChatCount + meetAlerts;
}

export async function loadInboxMessageBadgeCount(admin: SupabaseClient, _userId: string) {
  const counts = await loadNavBadgeCounts(admin);
  return counts.unreadMessagesCount;
}

export async function loadInboxNotificationBadgeCount(admin: SupabaseClient, _userId: string) {
  const counts = await loadNavBadgeCounts(admin);
  return counts.unreadNotificationsCount;
}

export async function loadConnectNavBadgeCount(admin: SupabaseClient, userId: string) {
  const [{ count: pendingCount, error: pendingError }, notificationCount] = await Promise.all([
    admin
      .from("user_connections")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", userId)
      .eq("status", "pending"),
    countUnreadNotificationsByTypes(admin, userId, [
      "connection_request",
      "connection_request_received",
    ]),
  ]);

  if (pendingError) {
    console.error("Failed to load connect pending requests:", pendingError);
  }

  return (pendingCount || 0) + notificationCount;
}

export async function loadProfileNavBadgeCount(admin: SupabaseClient, userId: string) {
  return countUnreadNotificationsByTypes(admin, userId, PROFILE_ALERT_TYPES);
}

/** Aggregate unread count for home-screen app icon badge (no double-counting). */
export async function loadAppIconBadgeCount(admin: SupabaseClient, _userId: string) {
  const counts = await loadNavBadgeCounts(admin);
  return counts.totalBadgeCount;
}
