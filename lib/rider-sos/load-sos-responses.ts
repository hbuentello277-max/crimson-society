import type {
  RiderSosResponderView,
  RiderSosResponseRow,
  RiderSosResponseStatus,
} from "@/lib/rider-sos/response-types";
import { supabase } from "@/lib/supabase";

export async function loadMySosResponse(sosEventId: string) {
  const { data, error } = await supabase.rpc("get_my_rider_sos_response", {
    p_sos_event_id: sosEventId,
  });

  if (error) {
    throw error;
  }

  return (data as RiderSosResponseRow | null) ?? null;
}

export async function setSosResponse(sosEventId: string, status: RiderSosResponseStatus) {
  const { data, error } = await supabase.rpc("set_rider_sos_response", {
    p_sos_event_id: sosEventId,
    p_status: status,
    p_responder_latitude: null,
    p_responder_longitude: null,
    p_responder_location_accuracy: null,
  });

  if (error) {
    throw error;
  }

  return data as RiderSosResponseRow;
}

export async function setSosResponseWithLocation(
  sosEventId: string,
  status: RiderSosResponseStatus,
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy?: number | null;
  },
) {
  const { data, error } = await supabase.rpc("set_rider_sos_response", {
    p_sos_event_id: sosEventId,
    p_status: status,
    p_responder_latitude: location.latitude,
    p_responder_longitude: location.longitude,
    p_responder_location_accuracy: location.accuracy ?? null,
  });

  if (error) {
    throw error;
  }

  return data as RiderSosResponseRow;
}

export async function loadSosResponders(sosEventId: string) {
  const { data, error } = await supabase.rpc("list_rider_sos_responders", {
    p_sos_event_id: sosEventId,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as RiderSosResponderView[];
}

export async function loadAdminSosRespondersByEventIds(eventIds: string[]) {
  const grouped: Record<string, RiderSosResponderView[]> = {};

  await Promise.all(
    eventIds.map(async (eventId) => {
      try {
        grouped[eventId] = await loadSosResponders(eventId);
      } catch {
        grouped[eventId] = [];
      }
    }),
  );

  return grouped;
}
