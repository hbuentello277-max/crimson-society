import { parseDashboardMeetRoute, type DashboardMapMeet } from "@/lib/meets/dashboard-map";
import { deriveMeetLifecycle, parseMeetStatus, parseMeetTrackingStatus } from "@/lib/meets/lifecycle";
import { parseDashboardWaypoints } from "@/lib/dashboard/parsers";
import type { DashboardMeet, DashboardRideRow } from "@/lib/dashboard/types";

export function mapRideToDashboardMeet(
  ride: DashboardRideRow,
  attendeeCounts: Map<string, number>,
  liveCounts: Map<string, number>,
  hostNames: Map<string, string>,
  now: number,
): DashboardMeet | null {
  if (
    ride.meet_point_lat === null ||
    ride.meet_point_lng === null ||
    !Number.isFinite(ride.meet_point_lat) ||
    !Number.isFinite(ride.meet_point_lng)
  ) {
    return null;
  }

  const trackingStatus = parseMeetTrackingStatus(ride.tracking_status);
  const status = parseMeetStatus(ride.status);
  const meetDurationMinutes = ride.meet_duration_minutes ?? null;
  const lifecyclePhase = deriveMeetLifecycle({
    status,
    trackingStatus,
    date: ride.date,
    time: ride.time,
    meetDurationMinutes,
    now,
  });

  if (lifecyclePhase !== "active" && lifecyclePhase !== "upcoming") {
    return null;
  }

  return {
    id: ride.id,
    hostId: ride.host_id,
    coHostId: ride.co_host_id ?? null,
    name: ride.name || "Untitled Meet",
    date: ride.date || "",
    time: ride.time || "",
    meetPoint: ride.meet_point || "Meet point pending",
    destination: ride.destination || "Destination pending",
    city: ride.city || ride.meet_point || "Location pending",
    cover: ride.cover || null,
    lat: ride.meet_point_lat,
    lng: ride.meet_point_lng,
    route: parseDashboardMeetRoute(ride.route),
    waypoints: parseDashboardWaypoints(ride.waypoints),
    trackingStatus,
    startedAt: ride.started_at,
    meetDurationMinutes,
    status,
    distance: ride.distance,
    duration: ride.duration,
    privacy: (ride.privacy as DashboardMapMeet["privacy"]) || "Open",
    visibility: ride.visibility,
    riderCount: attendeeCounts.get(ride.id) || 0,
    liveRiderCount: liveCounts.get(ride.id) || 0,
    hostName: hostNames.get(ride.host_id) || null,
    lifecyclePhase,
  };
}
