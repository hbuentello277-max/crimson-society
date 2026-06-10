import {
  deriveMeetLifecycle,
  meetLifecycleLabel,
  type MeetLifecyclePhase,
} from "@/lib/meets/lifecycle";
import { hasRoadGeometry, parseRoute, type RoutePoint } from "@/lib/meets/route-geometry";
import type { MeetPrivacy, MeetTrackingStatus } from "@/lib/meets/types";

export type DashboardMapMeet = {
  id: string;
  hostId: string;
  coHostId?: string | null;
  name: string;
  date: string;
  time: string;
  meetPoint: string;
  destination: string;
  city: string;
  cover: string | null;
  lat: number;
  lng: number;
  route: RoutePoint[];
  waypoints: Array<RoutePoint & { id: string; label: string }>;
  trackingStatus: MeetTrackingStatus;
  startedAt: string | null;
  meetDurationMinutes: number | null;
  status: string | null;
  distance: string | null;
  duration: string | null;
  privacy: MeetPrivacy;
  visibility: string | null;
  riderCount: number;
  liveRiderCount: number;
  hostName: string | null;
  coHostName?: string | null;
  lifecyclePhase: MeetLifecyclePhase;
};

export type DashboardMapMeetMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  lifecyclePhase: MeetLifecyclePhase;
  riderCount: number;
  liveRiderCount: number;
  isFeatured: boolean;
};

export function getMeetLifecyclePhase(
  meet: Pick<
    DashboardMapMeet,
    "status" | "trackingStatus" | "date" | "time" | "meetDurationMinutes"
  >,
  now?: number,
): MeetLifecyclePhase {
  return deriveMeetLifecycle({
    status: meet.status,
    trackingStatus: meet.trackingStatus,
    date: meet.date,
    time: meet.time,
    meetDurationMinutes: meet.meetDurationMinutes,
    now,
  });
}

export function buildDashboardMapMarkers(
  meets: DashboardMapMeet[],
  now?: number,
): DashboardMapMeetMarker[] {
  const visible = meets
    .map((meet) => ({
      ...meet,
      lifecyclePhase: getMeetLifecyclePhase(meet, now),
    }))
    .filter(
      (meet) =>
        (meet.lifecyclePhase === "active" || meet.lifecyclePhase === "upcoming") &&
        Number.isFinite(meet.lat) &&
        Number.isFinite(meet.lng),
    );

  const activeMeets = visible.filter((meet) => meet.lifecyclePhase === "active");
  const featuredId =
    activeMeets.find((meet) => meet.liveRiderCount > 0)?.id ??
    activeMeets.find((meet) => meet.trackingStatus === "active")?.id ??
    null;

  return visible
    .sort((a, b) => {
      const phaseRank = (phase: MeetLifecyclePhase) =>
        phase === "active" ? 0 : phase === "upcoming" ? 1 : 2;
      const rankDiff = phaseRank(a.lifecyclePhase) - phaseRank(b.lifecyclePhase);
      if (rankDiff !== 0) return rankDiff;
      return b.riderCount - a.riderCount;
    })
    .map((meet) => ({
      id: meet.id,
      lat: meet.lat,
      lng: meet.lng,
      label: meet.name,
      lifecyclePhase: meet.lifecyclePhase,
      riderCount: meet.riderCount,
      liveRiderCount: meet.liveRiderCount,
      isFeatured: meet.id === featuredId,
    }));
}

export function groupDashboardMapMeets(meets: DashboardMapMeet[], now?: number) {
  const active: DashboardMapMeet[] = [];
  const upcoming: DashboardMapMeet[] = [];

  for (const meet of meets) {
    const lifecyclePhase = getMeetLifecyclePhase(meet, now);
    const enriched = { ...meet, lifecyclePhase };
    if (lifecyclePhase === "active") active.push(enriched);
    if (lifecyclePhase === "upcoming") upcoming.push(enriched);
  }

  active.sort((a, b) => b.liveRiderCount - a.liveRiderCount || b.riderCount - a.riderCount);
  upcoming.sort((a, b) => {
    const aTime = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
    const bTime = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
    return aTime - bTime;
  });

  return { active, upcoming };
}

export function dashboardMeetHasRoute(meet: Pick<DashboardMapMeet, "route">) {
  return hasRoadGeometry(meet.route);
}

export function dashboardMeetLifecycleLabel(phase: MeetLifecyclePhase) {
  return meetLifecycleLabel(phase);
}

export function parseDashboardMeetRoute(value: unknown) {
  return parseRoute(value);
}
