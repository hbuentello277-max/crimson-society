import { MEET_TABLES } from "@/lib/meets/db-tables";
import { supabase } from "@/lib/supabase";

export async function assignMeetCoHost(meetId: string, hostUserId: string, coHostUserId: string) {
  if (coHostUserId === hostUserId) {
    return { ok: false as const, error: "Co-host must be a different rider." };
  }

  const { data, error } = await supabase
    .from(MEET_TABLES.meets)
    .update({ co_host_id: coHostUserId })
    .eq("id", meetId)
    .eq("host_id", hostUserId)
    .select("id, co_host_id")
    .maybeSingle();

  if (error) {
    console.error("Failed to assign co-host:", error);
    return { ok: false as const, error: "Could not assign co-host." };
  }

  if (!data) {
    return { ok: false as const, error: "Only the primary host can assign a co-host." };
  }

  await supabase.from(MEET_TABLES.attendees).upsert(
    {
      ride_id: meetId,
      user_id: coHostUserId,
      status: "going",
    },
    { onConflict: "ride_id,user_id" },
  );

  return { ok: true as const, coHostId: coHostUserId };
}

export async function removeMeetCoHost(meetId: string, hostUserId: string) {
  const { data, error } = await supabase
    .from(MEET_TABLES.meets)
    .update({ co_host_id: null })
    .eq("id", meetId)
    .eq("host_id", hostUserId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to remove co-host:", error);
    return { ok: false as const, error: "Could not remove co-host." };
  }

  if (!data) {
    return { ok: false as const, error: "Only the primary host can remove the co-host." };
  }

  return { ok: true as const };
}
