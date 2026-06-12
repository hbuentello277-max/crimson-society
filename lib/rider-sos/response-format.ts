import type { RiderSosResponseStatus } from "@/lib/rider-sos/response-types";

export function formatResponderCount(count: number) {
  if (count <= 0) return null;
  if (count === 1) return "👥 1 Rider Responding";
  return `👥 ${count} Riders Responding`;
}

export function formatResponseStatusLabel(status: RiderSosResponseStatus) {
  switch (status) {
    case "responding":
      return "Responding";
    case "arrived":
      return "Arrived";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function isActiveResponseStatus(status: RiderSosResponseStatus | null | undefined) {
  return status === "responding" || status === "arrived";
}

export const RIDER_SOS_ETA_AVERAGE_MPH = 15;

export function estimateSosEtaMinutes(
  distanceMiles: number | null | undefined,
  averageMph = RIDER_SOS_ETA_AVERAGE_MPH,
) {
  if (distanceMiles == null) return null;

  const distance = Number(distanceMiles);
  if (!Number.isFinite(distance) || distance < 0 || averageMph <= 0) {
    return null;
  }

  if (distance === 0) return 1;
  return Math.max(1, Math.ceil((distance / averageMph) * 60));
}

export function formatSosEtaMinutes(etaMinutes: number | null | undefined) {
  const eta = Number(etaMinutes);
  if (!Number.isFinite(eta) || eta <= 0) return null;
  const rounded = Math.max(1, Math.round(eta));
  return `${rounded} min away`;
}

export function formatSosDistanceSummary(distanceMiles: number | null | undefined) {
  const distance = Number(distanceMiles);
  if (!Number.isFinite(distance) || distance < 0) return "Distance unavailable";
  return `${distance.toFixed(1)} miles away`;
}

export function formatSosResponseEtaLine(input: {
  status: RiderSosResponseStatus | null | undefined;
  etaMinutes?: number | null;
}) {
  if (input.status === "arrived") return "Arrived";
  if (input.status === "cancelled") return "Cancelled";

  const eta = formatSosEtaMinutes(input.etaMinutes);
  return `Responding · ${eta ?? "ETA unavailable"}`;
}
