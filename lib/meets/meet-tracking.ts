import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import type { MeetTrackingStatus } from "@/lib/meets/types";

export type MeetTrackingLifecycleRow = {
  host_id: string | null;
  status: string | null;
  tracking_status: string | null;
  started_at: string | null;
  ended_at: string | null;
};

export async function startMeetTracking(meetId: string, hostUserId: string) {
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from(MEET_TABLES.meets)
    .update({
      tracking_status: "active",
      started_at: startedAt,
      ended_at: null,
    })
    .eq("id", meetId)
    .eq("host_id", hostUserId)
    .select("host_id, status, tracking_status, started_at, ended_at")
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: "Only the meet host can start tracking." };
  }

  return { ok: true as const, row: data as MeetTrackingLifecycleRow, startedAt };
}

export function parseMeetTrackingLifecycleRow(row: MeetTrackingLifecycleRow) {
  const trackingStatus = row.tracking_status;
  return {
    trackingStatus:
      trackingStatus === "active" || trackingStatus === "ended"
        ? (trackingStatus as MeetTrackingStatus)
        : ("not_started" as MeetTrackingStatus),
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}
