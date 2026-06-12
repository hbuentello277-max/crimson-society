export const RIDER_SOS_RESPONSE_STATUSES = ["responding", "arrived", "cancelled"] as const;

export type RiderSosResponseStatus = (typeof RIDER_SOS_RESPONSE_STATUSES)[number];

export type RiderSosResponseRow = {
  id: string;
  sos_event_id: string;
  responder_user_id: string;
  status: RiderSosResponseStatus;
  responder_latitude: number | null;
  responder_longitude: number | null;
  responder_location_accuracy: number | null;
  distance_miles: number | null;
  eta_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type RiderSosResponderView = {
  id: string;
  responder_user_id: string;
  rider_name: string;
  bike_info: string | null;
  status: RiderSosResponseStatus;
  distance_miles: number | null;
  eta_minutes: number | null;
  created_at: string;
  updated_at: string;
};
