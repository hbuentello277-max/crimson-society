import type { RideRoutePoint } from "@/types/rides";

const EARTH_RADIUS_MILES = 3958.7613;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceMiles(from: RideRoutePoint, to: RideRoutePoint) {
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_MILES * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getRouteDistanceMiles(points: RideRoutePoint[]) {
  return points.reduce((total, point, index) => {
    const previous = points[index - 1];
    return previous ? total + getDistanceMiles(previous, point) : total;
  }, 0);
}
