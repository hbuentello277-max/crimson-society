/**
 * Centralized Supabase table names for the meets ecosystem.
 * Database tables retain ride_* names until Phase 8 migration.
 */
export const MEET_TABLES = {
  meets: "rides",
  attendees: "ride_attendees",
  liveLocations: "ride_live_locations",
  messages: "ride_messages",
  messageReads: "ride_message_reads",
  notificationSubscriptions: "ride_notification_subscriptions",
} as const;

export const MEET_STORAGE_BUCKETS = {
  covers: "ride-covers",
  chatMedia: "ride-chat-media",
} as const;

export type MeetTableName = (typeof MEET_TABLES)[keyof typeof MEET_TABLES];
