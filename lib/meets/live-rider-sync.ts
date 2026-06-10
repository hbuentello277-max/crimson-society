import type { LiveRideRider } from "@/components/MeetMap";

export const LIVE_RIDER_STALE_MS = 30 * 60 * 1000;

export type LiveLocationSyncRow = {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
  sharing_enabled?: boolean | null;
};

export function isLiveLocationRowVisible(
  row: Pick<LiveLocationSyncRow, "sharing_enabled" | "updated_at">,
  nowMs: number,
  staleMs: number = LIVE_RIDER_STALE_MS,
): boolean {
  if (row.sharing_enabled === false) return false;
  const updatedAtMs = new Date(row.updated_at).getTime();
  if (Number.isNaN(updatedAtMs)) return false;
  return nowMs - updatedAtMs <= staleMs;
}

export function upsertLiveRider(
  riders: LiveRideRider[],
  rider: LiveRideRider,
): LiveRideRider[] {
  const index = riders.findIndex((entry) => entry.user_id === rider.user_id);
  if (index === -1) {
    return [...riders, rider];
  }

  const next = [...riders];
  next[index] = rider;
  return next;
}

export function removeLiveRider(riders: LiveRideRider[], userId: string): LiveRideRider[] {
  return riders.filter((rider) => rider.user_id !== userId);
}

export function dedupeLiveRiders(riders: LiveRideRider[]): LiveRideRider[] {
  const byUserId = new Map<string, LiveRideRider>();

  for (const rider of riders) {
    byUserId.set(rider.user_id, rider);
  }

  return Array.from(byUserId.values());
}

export function filterStaleLiveRiders(
  riders: Array<LiveRideRider & { last_updated_at?: string | null }>,
  nowMs: number,
  staleMs: number = LIVE_RIDER_STALE_MS,
): LiveRideRider[] {
  return riders.filter((rider) => {
    if (!rider.last_updated_at) return true;
    const updatedAtMs = new Date(rider.last_updated_at).getTime();
    if (Number.isNaN(updatedAtMs)) return false;
    return nowMs - updatedAtMs <= staleMs;
  });
}

export function applyLiveLocationRowChange(input: {
  riders: LiveRideRider[];
  row: LiveLocationSyncRow | null;
  rider: LiveRideRider | null;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  nowMs: number;
}): LiveRideRider[] {
  if (input.eventType === "DELETE") {
    const userId = input.row?.user_id;
    return userId ? removeLiveRider(input.riders, userId) : input.riders;
  }

  if (!input.row || !input.rider) {
    return input.riders;
  }

  if (!isLiveLocationRowVisible(input.row, input.nowMs)) {
    return removeLiveRider(input.riders, input.row.user_id);
  }

  return dedupeLiveRiders(upsertLiveRider(input.riders, input.rider));
}
