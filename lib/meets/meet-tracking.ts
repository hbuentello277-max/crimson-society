import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import type { MeetTrackingStatus } from "@/lib/meets/types";

export type MeetTrackingLifecycleRow = {
  host_id: string | null;
  co_host_id?: string | null;
  status: string | null;
  tracking_status: string | null;
  started_at: string | null;
  ended_at: string | null;
};

export async function startMeetTracking(meetId: string, actorUserId: string) {
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from(MEET_TABLES.meets)
    .update({
      tracking_status: "active",
      started_at: startedAt,
      ended_at: null,
    })
    .eq("id", meetId)
    .or(`host_id.eq.${actorUserId},co_host_id.eq.${actorUserId}`)
    .select("host_id, co_host_id, status, tracking_status, started_at, ended_at")
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: "Only the meet host or co-host can start the meet." };
  }

  return { ok: true as const, row: data as MeetTrackingLifecycleRow, startedAt };
}

export async function endMeetTracking(
  meetId: string,
  actorUserId: string,
  options: { isAdmin?: boolean } = {},
) {
  const endedAt = new Date().toISOString();
  let query = supabase
    .from(MEET_TABLES.meets)
    .update({
      tracking_status: "ended",
      ended_at: endedAt,
    })
    .eq("id", meetId);

  if (!options.isAdmin) {
    query = query.or(`host_id.eq.${actorUserId},co_host_id.eq.${actorUserId}`);
  }

  const { data, error } = await query
    .select("host_id, co_host_id, status, tracking_status, started_at, ended_at")
    .maybeSingle();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  if (!data) {
    return { ok: false as const, error: "Only the meet host or co-host can end the meet." };
  }

  return { ok: true as const, row: data as MeetTrackingLifecycleRow, endedAt };
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
