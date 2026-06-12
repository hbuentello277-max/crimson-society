import { RIDER_SOS_NEARBY_RADIUS_MILES } from "@/lib/rider-sos/nearby-config";
import type { NearbyRiderSosAlert } from "@/lib/rider-sos/nearby-types";
import { getDistanceMiles } from "@/lib/gps/distance";

export function filterNearbySosAlerts(
  alerts: NearbyRiderSosAlert[],
  viewer: { lat: number; lng: number } | null,
  radiusMiles = RIDER_SOS_NEARBY_RADIUS_MILES,
) {
  if (!viewer) {
    return alerts;
  }

  return alerts.filter((alert) => {
    if (alert.latitude == null || alert.longitude == null) {
      return false;
    }

    const distance = getDistanceMiles(
      { lat: viewer.lat, lng: viewer.lng },
      { lat: Number(alert.latitude), lng: Number(alert.longitude) },
    );

    return distance <= radiusMiles;
  });
}
