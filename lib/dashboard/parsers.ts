import type { CrimsonSound } from "@/lib/sounds";
import type {
  DashboardRawPost,
  DashboardRawProfile,
  DashboardRideWaypoint,
  DashboardRoutePoint,
} from "@/lib/dashboard/types";

export function pickDashboardProfile(profileInput: DashboardRawProfile | DashboardRawProfile[] | undefined) {
  if (Array.isArray(profileInput)) return profileInput[0] ?? null;
  return profileInput ?? null;
}

export function pickDashboardSound(postSounds: DashboardRawPost["post_sounds"]) {
  const sound = postSounds?.[0]?.sounds;
  if (Array.isArray(sound)) return sound[0] ?? null;
  return sound ?? null;
}

export function isDashboardRoutePoint(value: unknown): value is DashboardRoutePoint {
  return (
    typeof value === "object" &&
    value !== null &&
    "lat" in value &&
    "lng" in value &&
    typeof (value as DashboardRoutePoint).lat === "number" &&
    typeof (value as DashboardRoutePoint).lng === "number" &&
    Number.isFinite((value as DashboardRoutePoint).lat) &&
    Number.isFinite((value as DashboardRoutePoint).lng)
  );
}

export function parseDashboardRoute(value: unknown) {
  if (!Array.isArray(value)) return [];
  const route = value.filter(isDashboardRoutePoint);
  return route.length > 1 ? route : [];
}

export function parseDashboardWaypoints(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is DashboardRideWaypoint => {
    return (
      isDashboardRoutePoint(item) &&
      "id" in item &&
      "label" in item &&
      typeof item.id === "string" &&
      typeof item.label === "string"
    );
  });
}
