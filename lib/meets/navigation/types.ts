import type { MeetLifecyclePhase } from "@/lib/meets/lifecycle";
import type { MeetTrackingStatus } from "@/lib/meets/types";
import type { RoutePoint } from "@/lib/meets/route-geometry";

/** Primary navigation lifecycle — drives page behavior. */
export type NavigationState =
  | "idle"
  | "loading"
  | "gps_permission_required"
  | "gps_initializing"
  | "ready"
  | "navigating"
  | "paused"
  | "error";

export type GpsConnectionStatus =
  | "idle"
  | "requesting"
  | "connected"
  | "denied"
  | "unavailable"
  | "error";

export type NavigationPosition = {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speedMph: number | null;
  timestamp: number;
};

export type NavigationRouteSegment = {
  index: number;
  start: RoutePoint;
  end: RoutePoint;
  distanceMiles: number;
};

export type NavigationStep = {
  id: string;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string | null;
  maneuverModifier: string | null;
  maneuverLocation: RoutePoint | null;
  stepGeometry: RoutePoint[];
  routePointIndexStart: number;
  routePointIndexEnd: number;
};

/** Navigation-ready route abstraction (replaces raw point arrays in UI). */
export type NavigationRoute = {
  meetId: string;
  points: RoutePoint[];
  segments: NavigationRouteSegment[];
  steps: NavigationStep[];
  totalDistanceMiles: number;
  meetPoint: string;
  destination: string;
  plannedDistanceLabel: string | null;
  plannedDurationLabel: string | null;
};

export type NavigationProgress = {
  currentSegmentIndex: number;
  currentRouteIndex: number;
  distanceTraveledMiles: number;
  distanceRemainingMiles: number;
  percentComplete: number;
};

/** HUD-facing metrics for navigation display. */
export type NavigationMetrics = {
  etaLabel: string;
  distanceRemainingLabel: string;
  timeRemainingLabel: string;
  currentSpeedLabel: string;
  nextInstructionLabel: string;
  distanceToManeuverLabel: string;
  nextTurnLabel: string;
  routeProgressLabel: string;
  hasManeuverData: boolean;
};

export type OffRouteStatus = "on_route" | "possibly_off_route" | "off_route" | "returning";

export type OffRouteSessionState = {
  offRouteStatus: OffRouteStatus;
  distanceFromRouteMeters: number | null;
  nearestRouteSegmentIndex: number | null;
  nearestRejoinPoint: RoutePoint | null;
  lastOffRouteAt: string | null;
  lastBackOnRouteAt: string | null;
  bannerMessage: string | null;
};

export type NavigationArrivalSessionState = {
  atMeetStart: boolean;
  atDestination: boolean;
  bannerMessage: string | null;
};

export type NavigationMeetContext = {
  id: string;
  name: string;
  hostId: string | null;
  hostName: string | null;
  meetPoint: string;
  destination: string;
  trackingStatus: MeetTrackingStatus;
  lifecyclePhase: MeetLifecyclePhase;
  distanceLabel: string | null;
  durationLabel: string | null;
};

/** In-memory navigation session — single source of truth for the navigation page. */
export type NavigationSession = {
  meetId: string;
  userId: string;
  startedAt: string;
  gpsStatus: GpsConnectionStatus;
  routeLoaded: boolean;
  navigationState: NavigationState;
  latestPosition: NavigationPosition | null;
  route: NavigationRoute | null;
  meet: NavigationMeetContext | null;
  progress: NavigationProgress | null;
  metrics: NavigationMetrics;
  error: string | null;
  shareError: string | null;
  isPaused: boolean;
  offRoute: OffRouteSessionState;
  arrival: NavigationArrivalSessionState;
};

export const EMPTY_NAVIGATION_ARRIVAL: NavigationArrivalSessionState = {
  atMeetStart: false,
  atDestination: false,
  bannerMessage: null,
};

export const EMPTY_NAVIGATION_METRICS: NavigationMetrics = {
  etaLabel: "—",
  distanceRemainingLabel: "—",
  timeRemainingLabel: "—",
  currentSpeedLabel: "—",
  nextInstructionLabel: "Follow route",
  distanceToManeuverLabel: "—",
  nextTurnLabel: "Follow route",
  routeProgressLabel: "0%",
  hasManeuverData: false,
};
