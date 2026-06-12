import type { SosEventStatus, SosType } from "@/lib/rider-sos/sos-types";

/** Sanitized active SOS alert exposed to nearby riders (no emergency contact or medical notes). */
export type NearbyRiderSosAlert = {
  id: string;
  user_id: string;
  rider_name: string;
  rider_username: string | null;
  sos_type: SosType;
  status: SosEventStatus;
  bike_info: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  distance_miles: number | null;
};

/** Phase 3B placeholder: volunteer responder tracking will attach to alert id. */
export type RiderSosAlertResponder = {
  alert_id: string;
  responder_user_id: string;
  status: "responding" | "arrived" | "cancelled";
};
