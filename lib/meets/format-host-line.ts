import type { MeetAttendee } from "@/lib/meets/types";

export function primaryHostDisplayName(host: MeetAttendee) {
  return host.name?.trim() || "Crimson Member";
}

export function formatMeetHostLines(host: MeetAttendee, coHost?: MeetAttendee | null) {
  const lines = [`Hosted by ${primaryHostDisplayName(host)}`];

  if (coHost?.name?.trim()) {
    lines.push(`Co-host: ${coHost.name.trim()}`);
  }

  return lines;
}
