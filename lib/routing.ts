export type RoutingCoordinate = {
  lat: number;
  lng: number;
};

export type RoutingWaypoint = RoutingCoordinate & {
  id?: string;
  label?: string;
};

export type RoutingProfile = "driving" | "driving-traffic" | "cycling";

export type SnappedRouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType: string | null;
  maneuverModifier: string | null;
  maneuverLocation: RoutingCoordinate | null;
  stepGeometry: RoutingCoordinate[];
};

export type SnappedRouteResult = {
  provider: "mapbox" | "osrm" | "mock";
  profile: RoutingProfile;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RoutingCoordinate[];
  legs: Array<{
    distanceMeters: number;
    durationSeconds: number;
    start: RoutingCoordinate;
    end: RoutingCoordinate;
  }>;
  steps: SnappedRouteStep[];
  waypoints: RoutingWaypoint[];
  raw?: unknown;
};

export type BuildSnappedRouteInput = {
  origin: RoutingCoordinate;
  destination: RoutingCoordinate;
  waypoints?: RoutingWaypoint[];
  profile?: RoutingProfile;
};

const DEFAULT_PROFILE: RoutingProfile = "driving";
const MAPBOX_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox";
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isRoutingCoordinate(value: unknown): value is RoutingCoordinate {
  return Boolean(
    value &&
      typeof value === "object" &&
      isFiniteNumber((value as RoutingCoordinate).lat) &&
      isFiniteNumber((value as RoutingCoordinate).lng),
  );
}

export function normalizeCoordinate(value: RoutingCoordinate): RoutingCoordinate {
  return {
    lat: Number(value.lat),
    lng: Number(value.lng),
  };
}

export function validateRouteInput(input: BuildSnappedRouteInput) {
  if (!isRoutingCoordinate(input.origin)) {
    throw new Error("Invalid routing origin.");
  }

  if (!isRoutingCoordinate(input.destination)) {
    throw new Error("Invalid routing destination.");
  }

  const safeWaypoints = Array.isArray(input.waypoints)
    ? input.waypoints.filter(isRoutingCoordinate).map((waypoint) => ({
        ...waypoint,
        lat: Number(waypoint.lat),
        lng: Number(waypoint.lng),
      }))
    : [];

  return {
    origin: normalizeCoordinate(input.origin),
    destination: normalizeCoordinate(input.destination),
    waypoints: safeWaypoints,
    profile: input.profile ?? DEFAULT_PROFILE,
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(a: RoutingCoordinate, b: RoutingCoordinate) {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.asin(Math.sqrt(hav));
}

function estimateDurationSeconds(distanceMeters: number) {
  const motorcycleFriendlyMetersPerSecond = 16.67;
  return Math.round(distanceMeters / motorcycleFriendlyMetersPerSecond);
}

function buildCoordinateChain(input: {
  origin: RoutingCoordinate;
  destination: RoutingCoordinate;
  waypoints: RoutingWaypoint[];
}) {
  return [input.origin, ...input.waypoints, input.destination];
}

function buildRouteCoordinateString(points: RoutingCoordinate[]) {
  return points.map((point) => `${point.lng},${point.lat}`).join(";");
}

function buildMockLegs(points: RoutingCoordinate[]) {
  const legs: SnappedRouteResult["legs"] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const distanceMeters = haversineDistanceMeters(start, end);

    legs.push({
      start,
      end,
      distanceMeters,
      durationSeconds: estimateDurationSeconds(distanceMeters),
    });
  }

  return legs;
}

function interpolateSegment(
  start: RoutingCoordinate,
  end: RoutingCoordinate,
  steps = 12
) {
  const points: RoutingCoordinate[] = [];

  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps;
    const lat = start.lat + (end.lat - start.lat) * ratio;
    const lng = start.lng + (end.lng - start.lng) * ratio;

    const curveOffset = Math.sin(Math.PI * ratio) * 0.00012;

    points.push({
      lat: lat + curveOffset,
      lng: lng - curveOffset * 0.8,
    });
  }

  return points;
}

function parseGeometryCoordinates(value: unknown): RoutingCoordinate[] {
  if (!value || typeof value !== "object") return [];

  const coordinates = (value as { coordinates?: [number, number][] }).coordinates;
  if (!Array.isArray(coordinates)) return [];

  return coordinates
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map(([lng, lat]) => ({ lat, lng }));
}

function formatManeuverInstruction(type: string | null, modifier: string | null, name?: string | null) {
  const normalizedType = type?.toLowerCase() ?? "continue";
  const normalizedModifier = modifier?.toLowerCase() ?? null;
  const roadName = name?.trim();

  if (normalizedType === "arrive") {
    return roadName ? `Arrive at ${roadName}` : "Arrive at destination";
  }

  if (normalizedType === "depart") {
    return roadName ? `Head toward ${roadName}` : "Head toward destination";
  }

  if (normalizedType === "roundabout" || normalizedType === "rotary") {
    return roadName ? `Take the roundabout onto ${roadName}` : "Take the roundabout";
  }

  if (normalizedType === "merge") {
    const direction = normalizedModifier ? `Merge ${normalizedModifier}` : "Merge";
    return roadName ? `${direction} onto ${roadName}` : direction;
  }

  if (normalizedType === "fork") {
    const direction = normalizedModifier ? `Keep ${normalizedModifier}` : "Keep straight";
    return roadName ? `${direction} at the fork onto ${roadName}` : direction;
  }

  if (normalizedType === "turn" || normalizedType === "end of road" || normalizedType === "new name") {
    const direction = normalizedModifier ? `Turn ${normalizedModifier}` : "Turn";
    return roadName ? `${direction} onto ${roadName}` : direction;
  }

  if (normalizedType === "continue" || normalizedType === "straight") {
    return roadName ? `Continue straight on ${roadName}` : "Continue straight";
  }

  return roadName ? `Continue on ${roadName}` : "Continue";
}

type ProviderStep = {
  distance?: number;
  duration?: number;
  geometry?: unknown;
  name?: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    instruction?: string;
    location?: [number, number];
  };
};

function parseProviderSteps(steps: ProviderStep[] | undefined): SnappedRouteStep[] {
  if (!Array.isArray(steps)) return [];

  return steps.map((step) => {
    const maneuver = step.maneuver;
    const maneuverLocation =
      Array.isArray(maneuver?.location) && maneuver.location.length >= 2
        ? { lng: maneuver.location[0], lat: maneuver.location[1] }
        : null;

    return {
      instruction:
        maneuver?.instruction?.trim() ||
        formatManeuverInstruction(maneuver?.type ?? null, maneuver?.modifier ?? null, step.name),
      distanceMeters: typeof step.distance === "number" ? step.distance : 0,
      durationSeconds: typeof step.duration === "number" ? step.duration : 0,
      maneuverType: maneuver?.type ?? null,
      maneuverModifier: maneuver?.modifier ?? null,
      maneuverLocation,
      stepGeometry: parseGeometryCoordinates(step.geometry),
    };
  });
}

function flattenLegSteps(legs: Array<{ steps?: ProviderStep[] }> | undefined): SnappedRouteStep[] {
  if (!Array.isArray(legs)) return [];

  return legs.flatMap((leg) => parseProviderSteps(leg.steps));
}

export function buildMockSnappedRoute(
  input: BuildSnappedRouteInput
): SnappedRouteResult {
  const validated = validateRouteInput(input);
  const points = buildCoordinateChain(validated);
  const legs = buildMockLegs(points);

  const geometry = points.flatMap((point, index) => {
    if (index === points.length - 1) return [point];

    const segment = interpolateSegment(point, points[index + 1]);
    return index === 0 ? segment : segment.slice(1);
  });

  return {
    provider: "mock",
    profile: validated.profile,
    distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0),
    durationSeconds: legs.reduce((sum, leg) => sum + leg.durationSeconds, 0),
    geometry,
    legs,
    steps: [],
    waypoints: validated.waypoints,
    raw: null,
  };
}

function getMapboxToken() {
  const token =
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN || "";

  return token.trim();
}

type MapboxDirectionsResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
    legs?: Array<{
      distance: number;
      duration: number;
      steps?: ProviderStep[];
    }>;
  }>;
};

export async function buildMapboxSnappedRoute(
  input: BuildSnappedRouteInput
): Promise<SnappedRouteResult> {
  const validated = validateRouteInput(input);
  const token = getMapboxToken();

  if (!token) {
    throw new Error("Mapbox token is missing.");
  }

  const points = buildCoordinateChain(validated);
  const coordinates = buildRouteCoordinateString(points);
  const profile = validated.profile;

  const url =
    `${MAPBOX_BASE_URL}/${profile}/${coordinates}` +
    `?alternatives=false&continue_straight=true&geometries=geojson&overview=full&steps=true&access_token=${token}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mapbox directions request failed with ${response.status}.`);
  }

  const data = (await response.json()) as MapboxDirectionsResponse;
  const route = data.routes?.[0];

  if (!route?.geometry?.coordinates?.length) {
    throw new Error("Mapbox directions response did not include route geometry.");
  }

  const geometry = route.geometry.coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }));

  const legs: SnappedRouteResult["legs"] =
    route.legs?.map((leg, index) => ({
      distanceMeters: leg.distance,
      durationSeconds: leg.duration,
      start: points[index],
      end: points[index + 1] ?? points[index],
    })) ?? buildMockLegs(points);

  return {
    provider: "mapbox",
    profile,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry,
    legs,
    steps: flattenLegSteps(route.legs),
    waypoints: validated.waypoints,
    raw: data,
  };
}

type OsrmDirectionsResponse = {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
    legs?: Array<{
      distance: number;
      duration: number;
      steps?: ProviderStep[];
    }>;
  }>;
};

export async function buildOsrmSnappedRoute(
  input: BuildSnappedRouteInput
): Promise<SnappedRouteResult> {
  const validated = validateRouteInput(input);
  const points = buildCoordinateChain(validated);
  const coordinates = buildRouteCoordinateString(points);

  const url =
    `${OSRM_BASE_URL}/${coordinates}` +
    "?overview=full&geometries=geojson&steps=true";

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OSRM directions request failed with ${response.status}.`);
  }

  const data = (await response.json()) as OsrmDirectionsResponse;
  const route = data.routes?.[0];

  if (!route?.geometry?.coordinates?.length) {
    throw new Error("OSRM directions response did not include route geometry.");
  }

  const geometry = route.geometry.coordinates.map(([lng, lat]) => ({
    lat,
    lng,
  }));

  const legs: SnappedRouteResult["legs"] =
    route.legs?.map((leg, index) => ({
      distanceMeters: leg.distance,
      durationSeconds: leg.duration,
      start: points[index],
      end: points[index + 1] ?? points[index],
    })) ?? buildMockLegs(points);

  return {
    provider: "osrm",
    profile: validated.profile,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry,
    legs,
    steps: flattenLegSteps(route.legs),
    waypoints: validated.waypoints,
    raw: data,
  };
}

export async function buildSnappedRoute(
  input: BuildSnappedRouteInput
): Promise<SnappedRouteResult> {
  const token = getMapboxToken();

  if (token) {
    try {
      return await buildMapboxSnappedRoute(input);
    } catch (error) {
      console.error("Mapbox routing failed:", error);
    }
  }

  try {
    return await buildOsrmSnappedRoute(input);
  } catch (error) {
    console.error("OSRM routing failed:", error);
  }

  return buildMockSnappedRoute(input);
}
