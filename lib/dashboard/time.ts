import type { DashboardMeet } from "@/lib/dashboard/types";

export function dashboardTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function getDashboardRideDateTime(ride: Pick<DashboardMeet, "date" | "time">) {
  const date = ride.date?.trim();
  if (!date) return null;

  const time = ride.time?.trim();
  const safeTime = time && time.includes(":") ? time : "23:59";
  const parsed = new Date(`${date}T${safeTime}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDashboardMeetTime(date: string, time: string) {
  const parsed = getDashboardRideDateTime({ date, time });
  if (!parsed) return `${date || "Date TBD"} / ${time || "Time TBD"}`;

  return parsed.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDashboardLiveUpdated(value: string | null) {
  if (!value) return "No live signal";

  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (diffSeconds < 60) return "Updated just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
  return "Updated over 1h ago";
}
