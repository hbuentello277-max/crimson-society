import { supabase } from "@/lib/supabase";
import { MEET_TABLES } from "@/lib/meets/db-tables";

const MIN_PUBLISH_INTERVAL_MS = 2500;

export async function publishMeetLiveLocation(input: {
  meetId: string;
  userId: string;
  position: GeolocationPosition;
  force?: boolean;
  lastSentAtRef: { current: number };
}) {
  const nowMs = Date.now();
  if (!input.force && nowMs - input.lastSentAtRef.current < MIN_PUBLISH_INTERVAL_MS) {
    return { ok: true as const };
  }

  input.lastSentAtRef.current = nowMs;

  const { error } = await supabase.from(MEET_TABLES.liveLocations).upsert(
    {
      ride_id: input.meetId,
      user_id: input.userId,
      lat: Number(input.position.coords.latitude.toFixed(6)),
      lng: Number(input.position.coords.longitude.toFixed(6)),
      heading:
        typeof input.position.coords.heading === "number" &&
        Number.isFinite(input.position.coords.heading)
          ? input.position.coords.heading
          : null,
      speed:
        typeof input.position.coords.speed === "number" &&
        Number.isFinite(input.position.coords.speed)
          ? input.position.coords.speed
          : null,
      sharing_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "ride_id,user_id" },
  );

  if (error) {
    console.error("Failed to publish live location:", error);
    return { ok: false as const, error: "Could not share your live location with the meet." };
  }

  return { ok: true as const };
}

export async function clearMeetLiveLocation(meetId: string, userId: string) {
  const { error } = await supabase
    .from(MEET_TABLES.liveLocations)
    .delete()
    .eq("ride_id", meetId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to clear live location:", error);
  }
}
