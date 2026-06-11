import { MEET_TABLES } from "@/lib/meets/db-tables";
import { supabase } from "@/lib/supabase";

export type ProfileMeetRow = {
  id: string;
  name: string;
  date: string;
  cover: string | null;
};

const MEET_SELECT = "id, name, date, cover";
const ACTIVE_MEET_STATUS = "active";

export function formatProfileMeetDate(date: string) {
  const trimmed = date?.trim();
  if (!trimmed) return "Date pending";

  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return trimmed;
}

export async function loadProfileHostedMeets(
  userId: string,
): Promise<{ data: ProfileMeetRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from(MEET_TABLES.meets)
    .select(MEET_SELECT)
    .or(`host_id.eq.${userId},co_host_id.eq.${userId}`)
    .eq("status", ACTIVE_MEET_STATUS)
    .order("date", { ascending: false })
    .limit(48);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as ProfileMeetRow[]) ?? [], error: null };
}

export async function loadProfileAttendedMeets(
  userId: string,
): Promise<{ data: ProfileMeetRow[]; error: string | null }> {
  const { data: attendanceRows, error: attendanceError } = await supabase
    .from(MEET_TABLES.attendees)
    .select("ride_id")
    .eq("user_id", userId)
    .eq("status", "going");

  if (attendanceError) {
    return { data: [], error: attendanceError.message };
  }

  const rideIds = Array.from(
    new Set((attendanceRows ?? []).map((row) => row.ride_id).filter(Boolean)),
  );

  if (rideIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from(MEET_TABLES.meets)
    .select(MEET_SELECT)
    .in("id", rideIds)
    .eq("status", ACTIVE_MEET_STATUS)
    .neq("host_id", userId)
    .or(`co_host_id.is.null,co_host_id.neq.${userId}`)
    .order("date", { ascending: false })
    .limit(48);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as ProfileMeetRow[]) ?? [], error: null };
}
