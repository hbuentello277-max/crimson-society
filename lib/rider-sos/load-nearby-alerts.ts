import { RIDER_SOS_NEARBY_RADIUS_MILES } from "@/lib/rider-sos/nearby-config";
import type { NearbyRiderSosAlert } from "@/lib/rider-sos/nearby-types";
import { supabase } from "@/lib/supabase";

type ViewerLocation = {
  lat: number;
  lng: number;
} | null;

export async function loadNearbyActiveSosAlerts(
  viewer: ViewerLocation,
  radiusMiles = RIDER_SOS_NEARBY_RADIUS_MILES,
) {
  if (!viewer) {
    return [];
  }

  const { data, error } = await supabase.rpc("list_nearby_active_rider_sos_alerts", {
    p_viewer_lat: viewer?.lat ?? null,
    p_viewer_lng: viewer?.lng ?? null,
    p_radius_miles: radiusMiles,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as NearbyRiderSosAlert[];
}

export async function loadActiveSosAlertDetail(
  eventId: string,
  viewer: ViewerLocation,
  radiusMiles = RIDER_SOS_NEARBY_RADIUS_MILES,
  viewerUserId?: string | null,
  options: { canBypassNearby?: boolean } = {},
) {
  const { data, error } = await supabase.rpc("get_active_rider_sos_alert", {
    p_event_id: eventId,
    p_viewer_lat: viewer?.lat ?? null,
    p_viewer_lng: viewer?.lng ?? null,
    p_radius_miles: radiusMiles,
  });

  if (error) {
    throw error;
  }

  const row = ((data ?? [])[0] ?? null) as NearbyRiderSosAlert | null;
  if (!row) {
    return null;
  }

  if (viewerUserId && row.user_id === viewerUserId) {
    return row;
  }

  if (options.canBypassNearby) {
    return row;
  }

  if (!viewer) {
    return null;
  }

  const listed = await loadNearbyActiveSosAlerts(viewer, radiusMiles);
  return listed.find((item) => item.id === eventId) ?? null;
}
