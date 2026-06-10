"use client";

import Link from "next/link";
import {
  writeActiveMeetSession,
  type ActiveMeetSessionPayload,
} from "@/lib/meets/active-meet-session";
import type { DashboardMapMeet } from "@/lib/meets/dashboard-map";
import { parseMeetStatus } from "@/lib/meets/lifecycle";
import { meetNavigationHref } from "@/lib/meets/load-navigation-meet";

export type StartRideMeetInput = ActiveMeetSessionPayload;

type StartRideLinkProps = {
  meet: StartRideMeetInput;
  label?: string;
  className?: string;
  onNavigate?: () => void;
};

export function dashboardMeetToStartRideInput(
  meet: DashboardMapMeet,
): ActiveMeetSessionPayload {
  return {
    id: meet.id,
    hostId: meet.hostId,
    route: meet.route,
    waypoints: meet.waypoints,
    name: meet.name,
    meetPoint: meet.meetPoint,
    destination: meet.destination,
    date: meet.date,
    time: meet.time,
    meetDurationMinutes: meet.meetDurationMinutes,
    status: parseMeetStatus(meet.status),
    trackingStatus: meet.trackingStatus,
    startedAt: meet.startedAt,
    endedAt: null,
  };
}

export function StartRideLink({
  meet,
  label = "Start Ride",
  className,
  onNavigate,
}: StartRideLinkProps) {
  return (
    <Link
      href={meetNavigationHref(meet.id)}
      onClick={() => {
        writeActiveMeetSession(meet);
        onNavigate?.();
      }}
      className={className}
    >
      {label}
    </Link>
  );
}
