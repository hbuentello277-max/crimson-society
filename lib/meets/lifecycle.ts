import type { MeetStatus, MeetTrackingStatus } from "@/lib/meets/types";

export type MeetLifecyclePhase = "upcoming" | "active" | "past" | "canceled";

export type MeetLifecycleInput = {
  status?: MeetStatus | string | null;
  trackingStatus?: MeetTrackingStatus | string | null;
  date?: string | null;
  time?: string | null;
  meetDurationMinutes?: number | null;
  now?: number;
};

function parseMeetStartTime(date: string | null | undefined, time: string | null | undefined): Date | null {
  const normalizedDate = date?.trim();
  if (!normalizedDate) return null;

  const normalizedTime = time?.trim();
  const safeTime = normalizedTime && normalizedTime.includes(":") ? normalizedTime : "00:00";
  const parsed = new Date(`${normalizedDate}T${safeTime}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** End of the meet calendar day when no duration is set (23:59:59.999 local). */
function endOfMeetCalendarDay(date: string): Date {
  const parsed = new Date(`${date.trim()}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getMeetStartTime(
  date: string | null | undefined,
  time: string | null | undefined,
): Date | null {
  return parseMeetStartTime(date, time);
}

export function getMeetEndTime(
  date: string | null | undefined,
  time: string | null | undefined,
  meetDurationMinutes?: number | null,
): Date | null {
  const start = parseMeetStartTime(date, time);
  const normalizedDate = date?.trim();
  if (!normalizedDate) return null;

  if (
    typeof meetDurationMinutes === "number" &&
    Number.isFinite(meetDurationMinutes) &&
    meetDurationMinutes > 0 &&
    start
  ) {
    return new Date(start.getTime() + meetDurationMinutes * 60 * 1000);
  }

  return endOfMeetCalendarDay(normalizedDate);
}

export function parseMeetTrackingStatus(value: unknown): MeetTrackingStatus {
  return value === "active" || value === "ended" ? value : "not_started";
}

export function parseMeetStatus(value: unknown): MeetStatus {
  return value === "canceled" ? "canceled" : "active";
}

/**
 * Canonical meet lifecycle for all UI surfaces.
 * Schedule boundaries drive Upcoming / Active / Past.
 * Canceled meets are always Canceled. Host-ended tracking moves to Past early.
 */
export function deriveMeetLifecycle(input: MeetLifecycleInput): MeetLifecyclePhase {
  const status = parseMeetStatus(input.status);
  if (status === "canceled") {
    return "canceled";
  }

  const trackingStatus = parseMeetTrackingStatus(input.trackingStatus);
  if (trackingStatus === "ended") {
    return "past";
  }

  const now = input.now ?? Date.now();
  const start = getMeetStartTime(input.date, input.time);

  if (!start) {
    return "upcoming";
  }

  const end = getMeetEndTime(input.date, input.time, input.meetDurationMinutes);
  const startMs = start.getTime();
  const endMs = end?.getTime() ?? endOfMeetCalendarDay(input.date!.trim()).getTime();

  if (now < startMs) {
    return "upcoming";
  }

  if (now <= endMs) {
    return "active";
  }

  return "past";
}

export function meetLifecycleLabel(phase: MeetLifecyclePhase): string {
  switch (phase) {
    case "upcoming":
      return "Upcoming";
    case "active":
      return "Active";
    case "past":
      return "Past";
    case "canceled":
      return "Canceled";
  }
}

export function groupMeetsByLifecycle<T extends MeetLifecycleInput>(
  meets: T[],
  now?: number,
): Record<MeetLifecyclePhase, T[]> {
  const groups: Record<MeetLifecyclePhase, T[]> = {
    upcoming: [],
    active: [],
    past: [],
    canceled: [],
  };

  for (const meet of meets) {
    const phase = deriveMeetLifecycle({ ...meet, now });
    groups[phase].push(meet);
  }

  return groups;
}
