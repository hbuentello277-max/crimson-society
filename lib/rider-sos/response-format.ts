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
