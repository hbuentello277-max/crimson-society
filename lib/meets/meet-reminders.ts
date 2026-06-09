import type { SupabaseClient } from "@supabase/supabase-js";
import { getMeetStartTime } from "@/lib/meets/lifecycle";
import { meetReminderGroupKey } from "@/lib/notifications/grouping";

export type MeetReminderWindow = "24h" | "1h";

const WINDOW_MINUTES: Record<MeetReminderWindow, number> = {
  "24h": 24 * 60,
  "1h": 60,
};

const WINDOW_TOLERANCE_MINUTES: Record<MeetReminderWindow, number> = {
  "24h": 30,
  "1h": 15,
};

type MeetReminderCandidate = {
  meet_id: string;
  user_id: string;
  meet_name: string | null;
  reminder_window: MeetReminderWindow;
};

export function meetStartsWithinReminderWindow(
  date: string | null | undefined,
  time: string | null | undefined,
  reminderWindow: MeetReminderWindow,
  now: Date = new Date(),
) {
  const start = getMeetStartTime(date, time);
  if (!start) {
    return false;
  }

  const targetMs = WINDOW_MINUTES[reminderWindow] * 60 * 1000;
  const toleranceMs = WINDOW_TOLERANCE_MINUTES[reminderWindow] * 60 * 1000;
  const diffMs = start.getTime() - now.getTime();

  return diffMs >= targetMs - toleranceMs && diffMs <= targetMs + toleranceMs;
}

function meetDestinationUrl(meetId: string) {
  return `/meets?meet=${meetId}`;
}

export async function dispatchDueMeetReminders(admin: SupabaseClient) {
  const now = new Date();
  const { data: meets, error: meetsError } = await admin
    .from("rides")
    .select("id, name, date, time, status")
    .eq("status", "active");

  if (meetsError) {
    throw new Error(meetsError.message);
  }

  const candidates: MeetReminderCandidate[] = [];

  for (const meet of meets || []) {
    for (const reminderWindow of ["24h", "1h"] as const) {
      if (!meetStartsWithinReminderWindow(meet.date, meet.time, reminderWindow, now)) {
        continue;
      }

      const { data: attendees, error: attendeesError } = await admin
        .from("ride_attendees")
        .select("user_id")
        .eq("ride_id", meet.id);

      if (attendeesError) {
        throw new Error(attendeesError.message);
      }

      for (const attendee of attendees || []) {
        candidates.push({
          meet_id: meet.id,
          user_id: attendee.user_id as string,
          meet_name: (meet.name as string | null) ?? null,
          reminder_window: reminderWindow,
        });
      }
    }
  }

  let sent = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const { data: existingSent, error: existingError } = await admin
      .from("meet_reminder_sent")
      .select("id")
      .eq("meet_id", candidate.meet_id)
      .eq("user_id", candidate.user_id)
      .eq("reminder_window", candidate.reminder_window)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingSent) {
      skipped += 1;
      continue;
    }

    const meetLabel = candidate.meet_name?.trim() || "your meet";
    const body =
      candidate.reminder_window === "24h"
        ? `${meetLabel} starts in about 24 hours.`
        : `${meetLabel} starts in about 1 hour.`;
    const destinationUrl = meetDestinationUrl(candidate.meet_id);

    const { error: notifyError } = await admin.rpc("upsert_grouped_notification", {
      p_user_id: candidate.user_id,
      p_type: "meet_reminder",
      p_title: "Meet reminder",
      p_body: body,
      p_notification_group_key: meetReminderGroupKey(candidate.meet_id, candidate.user_id),
      p_actor_id: null,
      p_ride_id: candidate.meet_id,
      p_conversation_id: null,
      p_post_id: null,
      p_comment_id: null,
      p_deletion_request_id: null,
      p_target_url: destinationUrl,
      p_destination_url: destinationUrl,
      p_metadata: { reminder_window: candidate.reminder_window },
      p_preview_text: body,
      p_grouped_body_template: null,
    });

    if (notifyError) {
      throw new Error(notifyError.message);
    }

    const { error: sentError } = await admin.from("meet_reminder_sent").insert({
      meet_id: candidate.meet_id,
      user_id: candidate.user_id,
      reminder_window: candidate.reminder_window,
    });

    if (sentError) {
      throw new Error(sentError.message);
    }

    sent += 1;
  }

  return { sent, skipped, scanned: candidates.length };
}
