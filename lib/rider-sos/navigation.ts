import type { MapsNavigationTarget } from "@/lib/meets/maps-links";
import type { NearbyRiderSosAlert } from "@/lib/rider-sos/nearby-types";

export function buildRiderSosNavigationTarget(
  alert: Pick<NearbyRiderSosAlert, "latitude" | "longitude"> | null | undefined,
): MapsNavigationTarget | null {
  if (alert?.latitude == null || alert.longitude == null) {
    return null;
  }

  const lat = Number(alert?.latitude);
  const lng = Number(alert?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    label: "SOS location",
  };
}

