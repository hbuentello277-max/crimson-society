import type { NearbyRiderSosAlert } from "@/lib/rider-sos/nearby-types";

export function formatSosDistanceMiles(distanceMiles: number | null | undefined) {
  if (distanceMiles == null || !Number.isFinite(Number(distanceMiles))) {
    return "Distance unknown";
  }

  return `${Number(distanceMiles).toFixed(1)} miles away`;
}

export function formatSosTimeAgo(createdAt: string, nowMs = Date.now()) {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return "Recently";

  const minutes = Math.max(0, Math.floor((nowMs - createdMs) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function formatSosStatusLabel(status: NearbyRiderSosAlert["status"]) {
  if (status === "active") return "Active";
  if (status === "resolved") return "Resolved";
  if (status === "cancelled") return "Cancelled";
  return status;
}

export function riderSosDisplayName(alert: Pick<NearbyRiderSosAlert, "rider_name" | "rider_username">) {
  return alert.rider_name?.trim() || (alert.rider_username ? `@${alert.rider_username}` : "Crimson Rider");
}
