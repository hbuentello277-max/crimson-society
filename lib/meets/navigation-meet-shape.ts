import { parseMeetStatus, parseMeetTrackingStatus } from "@/lib/meets/lifecycle";
import { parseMeetWaypoints } from "@/lib/meets/meet-row-mapper";
import type { ActiveMeetSessionPayload } from "@/lib/meets/active-meet-session";
import type { NavigationStep } from "@/lib/meets/navigation/types";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import type { MeetStatus } from "@/lib/meets/types";

export type NavigationMeetShapeInput = {
  id: string;
  hostId: string | null;
  name: string;
  meetPoint: string;
  destination: string;
  date: string;
  time: string;
  meetDurationMinutes: number | null;
  status: MeetStatus | string;
  trackingStatus: string;
  startedAt: string | null;
  endedAt: string | null;
  distance: string | null;
  duration: string | null;
  route: RoutePoint[];
  waypoints: unknown;
  routeSteps: NavigationStep[];
};

export type NavigationMeetShape = ActiveMeetSessionPayload & {
  distance: string | null;
  duration: string | null;
  routeSteps: NavigationStep[];
};

/** Shared mapper for navigation loaders and compatibility tests. */
export function rowToNavigationMeetShape(input: NavigationMeetShapeInput): NavigationMeetShape {
  return {
    id: input.id,
    hostId: input.hostId,
    route: input.route,
    waypoints: parseMeetWaypoints(input.waypoints),
    name: input.name?.trim() || "Meet",
    meetPoint: input.meetPoint?.trim() || "Meet point",
    destination: input.destination?.trim() || "Destination",
    date: input.date,
    time: input.time,
    meetDurationMinutes: input.meetDurationMinutes,
    status: parseMeetStatus(input.status) as MeetStatus,
    trackingStatus: parseMeetTrackingStatus(input.trackingStatus),
    startedAt: input.startedAt,
    endedAt: input.endedAt,
    distance: input.distance,
    duration: input.duration,
    routeSteps: input.routeSteps,
  };
}
