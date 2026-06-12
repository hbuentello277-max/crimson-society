import type { LiveRideRider } from "@/components/MeetMap";
import { formatSosDistanceSummary, formatSosResponseEtaLine } from "@/lib/rider-sos/response-format";
import type { RiderSosResponseStatus } from "@/lib/rider-sos/response-types";
import { supabase } from "@/lib/supabase";

export const RIDER_SOS_RESPONDER_LOCATION_POLL_MS = 12_000;
export const RIDER_SOS_ARRIVAL_ASSIST_THRESHOLD_MILES = 0.05;

export type RiderSosResponderLocationView = {
  id: string;
  sos_event_id: string;
  responder_user_id: string;
  rider_name: string;
  bike_info: string | null;
  status: RiderSosResponseStatus;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  distance_miles: number | null;
  eta_minutes: number | null;
  updated_at: string;
};

export async function publishSosResponderLiveLocation(
  sosEventId: string,
  position: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  },
) {
  const { data, error } = await supabase.rpc("publish_rider_sos_responder_location", {
    p_sos_event_id: sosEventId,
    p_latitude: position.latitude,
    p_longitude: position.longitude,
    p_accuracy: position.accuracy ?? null,
    p_heading: position.heading ?? null,
    p_speed: position.speed ?? null,
  });

  if (error) throw error;
  return data as RiderSosResponderLocationView;
}

export async function clearSosResponderLiveLocation(sosEventId: string) {
  const { error } = await supabase.rpc("clear_rider_sos_responder_location", {
    p_sos_event_id: sosEventId,
  });

  if (error) throw error;
}

export async function loadSosResponderLiveLocations(sosEventId: string) {
  const { data, error } = await supabase.rpc("list_rider_sos_responder_locations", {
    p_sos_event_id: sosEventId,
  });

  if (error) throw error;
  return (data ?? []) as RiderSosResponderLocationView[];
}

export function shouldShowArrivalAssist(distanceMiles: number | null | undefined) {
  return (
    distanceMiles != null &&
    Number.isFinite(Number(distanceMiles)) &&
    Number(distanceMiles) <= RIDER_SOS_ARRIVAL_ASSIST_THRESHOLD_MILES
  );
}

export function responderLocationToMapRider(
  location: RiderSosResponderLocationView,
): LiveRideRider {
  return {
    user_id: location.responder_user_id,
    rider_name: location.rider_name,
    rider_display_name: location.rider_name,
    rider_username: null,
    rider_photo: null,
    lat: Number(location.latitude),
    lng: Number(location.longitude),
    distance_label: formatSosDistanceSummary(location.distance_miles),
    last_updated_label: formatSosResponseEtaLine({
      status: location.status,
      etaMinutes: location.eta_minutes,
    }),
    last_updated_at: location.updated_at,
  };
}

