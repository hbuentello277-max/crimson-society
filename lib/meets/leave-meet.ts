import { MEET_TABLES } from "@/lib/meets/db-tables";
import { clearMeetLiveLocation } from "@/lib/meets/publish-live-location";
import { supabase } from "@/lib/supabase";

export async function leaveMeetAttendance(meetId: string, userId: string) {
  const { error: activityError } = await supabase.rpc("log_ride_attendance_activity", {
    target_ride_id: meetId,
    activity: "left",
  });

  if (activityError) {
    console.error("Failed to log meet leave activity:", activityError);
  }

  await clearMeetLiveLocation(meetId, userId);

  const { error } = await supabase
    .from(MEET_TABLES.attendees)
    .delete()
    .eq("ride_id", meetId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to leave meet:", error);
    return { ok: false as const, error: "Could not leave meet." };
  }

  return { ok: true as const };
}
