import type { SupabaseClient } from "@supabase/supabase-js";
import {
  blockedUserIdSet,
  countUnreadMessages,
  type ConversationMemberBadgeRow,
  type MessageBadgeRow,
} from "@/lib/messages/unread-message-count";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import { deriveMeetLifecycle } from "@/lib/meets/lifecycle";
import type { NotificationType } from "@/lib/notifications";

const MEET_ALERT_TYPES: NotificationType[] = [
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

export async function loadMeetChatUnreadTotal(admin: SupabaseClient, userId: string) {
  const { data: rides, error: ridesError } = await admin
    .from(MEET_TABLES.meets)
    .select("id, date, time, meet_duration_minutes, tracking_status, status")
    .eq("status", "active");

  if (ridesError) {
    console.error("Failed to load meet badge rides:", ridesError);
    return 0;
  }

  const rideIds = (rides || [])
    .filter((ride) => {
      const phase = deriveMeetLifecycle({
        status: "active",
        date: ride.date,
        time: ride.time,
      });
      return phase === "upcoming" || phase === "active";
    })
    .map((ride) => ride.id);

  if (rideIds.length === 0) return 0;

  const [{ data: readRows }, { data: messageRows }] = await Promise.all([
    admin
      .from(MEET_TABLES.messageReads)
      .select("ride_id, last_read_at")
      .eq("user_id", userId)
      .in("ride_id", rideIds),
    admin
      .from(MEET_TABLES.messages)
      .select("ride_id, user_id, created_at")
      .in("ride_id", rideIds),
  ]);

  const readMap = new Map(
    (readRows || []).map((row: { ride_id: string; last_read_at: string }) => [
      row.ride_id,
      row.last_read_at,
    ]),
  );

  let total = 0;
  for (const message of messageRows || []) {
    const row = message as { ride_id: string; user_id: string; created_at: string };
    if (row.user_id === userId) continue;
    const lastReadAt = readMap.get(row.ride_id);
    if (!lastReadAt || row.created_at > lastReadAt) {
      total += 1;
    }
  }

  return total;
}

export async function loadMeetNavBadgeCount(admin: SupabaseClient, userId: string) {
  const [chatUnread, meetAlerts] = await Promise.all([
    loadMeetChatUnreadTotal(admin, userId),
    countUnreadNotificationsByTypes(admin, userId, MEET_ALERT_TYPES),
  ]);

  return chatUnread + meetAlerts;
}

export async function loadInboxMessageBadgeCount(admin: SupabaseClient, userId: string) {
  const [{ data: memberships, error: membershipsError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      admin
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", userId),
      admin
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
    ]);

  if (membershipsError || blocksError) {
    console.error("Failed to load inbox message badge:", membershipsError || blocksError);
    return 0;
  }

  const memberRows = (memberships || []) as ConversationMemberBadgeRow[];
  const conversationIds = memberRows.map((membership) => membership.conversation_id);
  if (conversationIds.length === 0) return 0;

  const { data: messages, error: messagesError } = await admin
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", conversationIds);

  if (messagesError) {
    console.error("Failed to load inbox messages for badge:", messagesError);
    return 0;
  }

  const blockedIds = blockedUserIdSet(userId, blocks || []);
  return countUnreadMessages(
    userId,
    memberRows,
    (messages || []) as MessageBadgeRow[],
    blockedIds,
  );
}

export async function loadInboxNotificationBadgeCount(admin: SupabaseClient, userId: string) {
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("Failed to load inbox notification badge:", error);
    return 0;
  }

  return count || 0;
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
export async function loadAppIconBadgeCount(admin: SupabaseClient, userId: string) {
  const [messageCount, notificationCount, meetChatUnread] = await Promise.all([
    loadInboxMessageBadgeCount(admin, userId),
    loadInboxNotificationBadgeCount(admin, userId),
    loadMeetChatUnreadTotal(admin, userId),
  ]);

  return messageCount + notificationCount + meetChatUnread;
}
