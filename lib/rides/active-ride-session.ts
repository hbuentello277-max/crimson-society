import type { RoutePoint } from "@/lib/rides/route-geometry";

export const ACTIVE_RIDE_STORAGE_KEY = "crimson-active-ride";

export type ActiveRideSessionPayload = {
  id: string;
  hostId: string | null;
  route: RoutePoint[];
  waypoints: unknown[];
  name: string;
  meetPoint: string;
  destination: string;
  trackingStatus: "not_started" | "active" | "ended";
  startedAt: string | null;
  endedAt: string | null;
};

export function writeActiveRideSession(payload: ActiveRideSessionPayload) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ACTIVE_RIDE_STORAGE_KEY, JSON.stringify(payload));
}

export function readActiveRideSession(): ActiveRideSessionPayload | null {
  if (typeof window === "undefined") return null;

  const stored = window.sessionStorage.getItem(ACTIVE_RIDE_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as ActiveRideSessionPayload;
  } catch {
    return null;
  }
}
