import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";
import { canSelfJoinMeet, getMeetJoinBlockMessage } from "@/lib/meet-privacy";
import type { MeetPrivacy } from "@/lib/meets/types";

export type JoinMeetInput = {
  meetId: string;
  userId: string | null | undefined;
  hostId?: string | null;
  coHostId?: string | null;
  privacy?: MeetPrivacy | string | null;
  visibility?: string | null;
  status?: string | null;
  isAlreadyGoing?: boolean;
  hasBlackcardAccess?: boolean;
  viewerFollowsHost?: boolean;
  viewerFavoritedHost?: boolean;
  isAdmin?: boolean;
};

export function canJoinDashboardMeet(input: JoinMeetInput) {
  if (input.status === "canceled") {
    return { allowed: false, message: "This meet was canceled." };
  }

  if (input.hostId && input.hostId === input.userId) {
    return { allowed: false, message: "You are hosting this meet." };
  }

  if (input.coHostId && input.coHostId === input.userId) {
    return { allowed: false, message: "You are co-hosting this meet." };
  }

  if (input.isAlreadyGoing) {
    return { allowed: true, message: null };
  }

  const allowed = canSelfJoinMeet({
    privacy: input.privacy,
    visibility: input.visibility,
    hostId: input.hostId,
    userId: input.userId,
    isAdmin: input.isAdmin ?? false,
    hasBlackcardAccess: input.hasBlackcardAccess ?? false,
    viewerFollowsHost: input.viewerFollowsHost ?? false,
    viewerFavoritedHost: input.viewerFavoritedHost ?? false,
    isGoing: false,
  });

  if (!allowed) {
    return {
      allowed: false,
      message: getMeetJoinBlockMessage({
        privacy: input.privacy,
        visibility: input.visibility,
        hasBlackcardAccess: input.hasBlackcardAccess ?? false,
        viewerFollowsHost: input.viewerFollowsHost ?? false,
        viewerFavoritedHost: input.viewerFavoritedHost ?? false,
      }),
    };
  }

  return { allowed: true, message: null };
}

export async function joinMeetAttendance(meetId: string, userId: string) {
  const { error } = await supabase.from(MEET_TABLES.attendees).upsert(
    {
      ride_id: meetId,
      user_id: userId,
      status: "going",
    },
    { onConflict: "ride_id,user_id" },
  );

  if (error) {
    console.error("Failed to join meet:", error);
    return { ok: false as const, error: "Could not join meet." };
  }

  const { error: activityError } = await supabase.rpc("log_ride_attendance_activity", {
    target_ride_id: meetId,
    activity: "joined",
  });

  if (activityError) {
    console.error("Failed to log meet join activity:", activityError);
  }

  return { ok: true as const };
}
