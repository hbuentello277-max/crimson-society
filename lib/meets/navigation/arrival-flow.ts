import { getDistanceMiles } from "@/lib/gps/distance";
import type { LiveRideRider } from "@/components/MeetMap";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import type { MeetTrackingStatus } from "@/lib/meets/types";
import {
  DESTINATION_ARRIVAL_MILES,
  MEET_START_ARRIVAL_MILES,
  type NavigationArrivalState,
} from "@/lib/meets/navigation/arrival";
import type { ArrivalUiPhase, NavigationPosition } from "@/lib/meets/navigation/types";

export const MEET_START_ARRIVAL_NOTICE_MS = 7_000;
export const DESTINATION_ARRIVAL_NOTICE_MS = 7_000;
export const MEET_START_LEAVE_BUFFER_MILES = MEET_START_ARRIVAL_MILES * 1.75;

export type NearestGroupRider = {
  name: string;
  distanceFeet: number;
  role: "host" | "rider";
};

export function milesToFeet(miles: number) {
  return Math.round(miles * 5280);
}

export function formatDistanceFeet(feet: number) {
  if (feet < 1000) return `${feet} ft away`;
  return `${(feet / 5280).toFixed(1)} mi away`;
}

export function findNearestGroupRider(
  position: NavigationPosition | null,
  riders: LiveRideRider[],
  hostId: string | null,
  hostName: string | null,
): NearestGroupRider | null {
  if (!position || riders.length === 0) return null;

  let nearest: NearestGroupRider | null = null;
  let nearestMiles = Number.POSITIVE_INFINITY;

  for (const rider of riders) {
    const miles = getDistanceMiles(position, { lat: rider.lat, lng: rider.lng });
    if (miles >= nearestMiles) continue;

    nearestMiles = miles;
    const isHost = !!hostId && rider.user_id === hostId;
    const riderName = rider.rider_display_name || rider.rider_name || "Crimson Member";
    nearest = {
      name: isHost ? hostName?.trim() || riderName : riderName,
      distanceFeet: milesToFeet(miles),
      role: isHost ? "host" : "rider",
    };
  }

  return nearest;
}

export function hasLeftMeetStartZone(position: NavigationPosition | null, meetStart: RoutePoint | null) {
  if (!position || !meetStart) return false;
  return getDistanceMiles(position, meetStart) > MEET_START_LEAVE_BUFFER_MILES;
}

export function shouldEnterMeetStartArrival(
  detection: NavigationArrivalState,
  trackingStatus: MeetTrackingStatus,
) {
  return (
    detection.atMeetStart &&
    !detection.atDestination &&
    trackingStatus !== "active" &&
    trackingStatus !== "ended"
  );
}

export function shouldClearMeetArrivalForRideMode(trackingStatus: MeetTrackingStatus) {
  return trackingStatus === "active";
}

export function resolveNextArrivalPhase(
  current: ArrivalUiPhase,
  input: {
    detection: NavigationArrivalState;
    trackingStatus: MeetTrackingStatus;
    position: NavigationPosition | null;
    meetStart: RoutePoint | null;
    now: number;
    phaseStartedAt: number | null;
  },
): ArrivalUiPhase {
  const { detection, trackingStatus, position, meetStart, now, phaseStartedAt } = input;

  if (detection.atDestination) {
    if (current === "ride_summary") return "ride_summary";
    if (current === "destination_notice") {
      if (phaseStartedAt && now - phaseStartedAt >= DESTINATION_ARRIVAL_NOTICE_MS) {
        return "ride_summary";
      }
      return "destination_notice";
    }
    return "destination_notice";
  }

  if (shouldClearMeetArrivalForRideMode(trackingStatus)) {
    return "none";
  }

  if (shouldEnterMeetStartArrival(detection, trackingStatus)) {
    if (current === "find_group") return "find_group";
    if (current === "meet_start_notice") {
      if (phaseStartedAt && now - phaseStartedAt >= MEET_START_ARRIVAL_NOTICE_MS) {
        return "find_group";
      }
      return "meet_start_notice";
    }
    return "meet_start_notice";
  }

  if (
    (current === "meet_start_notice" || current === "find_group") &&
    hasLeftMeetStartZone(position, meetStart)
  ) {
    return "none";
  }

  if (current === "destination_notice" || current === "ride_summary") {
    return "none";
  }

  return current === "meet_start_notice" || current === "find_group" ? current : "none";
}

export function meetArrivalBannerMessage(phase: ArrivalUiPhase) {
  switch (phase) {
    case "meet_start_notice":
      return "You've arrived at the meet start.";
    case "destination_notice":
      return "You've arrived at the destination.";
    default:
      return null;
  }
}

export function meetChatHref(meetId: string) {
  return `/meets?meet=${encodeURIComponent(meetId)}&section=chat`;
}
