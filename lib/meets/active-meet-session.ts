import type { RoutePoint } from "@/lib/meets/route-geometry";
import type { MeetTrackingStatus } from "@/lib/meets/types";

export const ACTIVE_MEET_STORAGE_KEY = "crimson-active-meet";
const LEGACY_ACTIVE_MEET_STORAGE_KEY = "crimson-active-ride";

export type ActiveMeetSessionPayload = {
  id: string;
  hostId: string | null;
  route: RoutePoint[];
  waypoints: unknown[];
  name: string;
  meetPoint: string;
  destination: string;
  trackingStatus: MeetTrackingStatus;
  startedAt: string | null;
  endedAt: string | null;
};

export function writeActiveMeetSession(payload: ActiveMeetSessionPayload) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ACTIVE_MEET_STORAGE_KEY, JSON.stringify(payload));
}

export function readActiveMeetSession(): ActiveMeetSessionPayload | null {
  if (typeof window === "undefined") return null;

  const stored =
    window.sessionStorage.getItem(ACTIVE_MEET_STORAGE_KEY) ??
    window.sessionStorage.getItem(LEGACY_ACTIVE_MEET_STORAGE_KEY);

  if (!stored) return null;

  try {
    return JSON.parse(stored) as ActiveMeetSessionPayload;
  } catch {
    return null;
  }
}

/** @deprecated Use writeActiveMeetSession */
export function writeActiveRideSession(payload: ActiveMeetSessionPayload) {
  writeActiveMeetSession(payload);
}

/** @deprecated Use readActiveMeetSession */
export function readActiveRideSession() {
  return readActiveMeetSession();
}
