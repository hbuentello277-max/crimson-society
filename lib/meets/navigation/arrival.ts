import { getDistanceMiles } from "@/lib/gps/distance";
import type { RoutePoint } from "@/lib/meets/route-geometry";
import type { NavigationPosition } from "@/lib/meets/navigation/types";

export const MEET_START_ARRIVAL_MILES = 0.08;
export const DESTINATION_ARRIVAL_MILES = 0.08;

export type NavigationArrivalState = {
  atMeetStart: boolean;
  atDestination: boolean;
  distanceToMeetStartMiles: number | null;
  distanceToDestinationMiles: number | null;
};

export function detectNavigationArrival(
  position: NavigationPosition | null,
  meetStart: RoutePoint | null,
  destination: RoutePoint | null,
): NavigationArrivalState {
  if (!position) {
    return {
      atMeetStart: false,
      atDestination: false,
      distanceToMeetStartMiles: null,
      distanceToDestinationMiles: null,
    };
  }

  const distanceToMeetStartMiles = meetStart
    ? getDistanceMiles(position, meetStart)
    : null;
  const distanceToDestinationMiles = destination
    ? getDistanceMiles(position, destination)
    : null;

  return {
    atMeetStart:
      distanceToMeetStartMiles !== null &&
      distanceToMeetStartMiles <= MEET_START_ARRIVAL_MILES,
    atDestination:
      distanceToDestinationMiles !== null &&
      distanceToDestinationMiles <= DESTINATION_ARRIVAL_MILES,
    distanceToMeetStartMiles,
    distanceToDestinationMiles,
  };
}
