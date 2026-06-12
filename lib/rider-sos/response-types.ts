export const RIDER_SOS_RESPONSE_STATUSES = ["responding", "arrived", "cancelled"] as const;

export type RiderSosResponseStatus = (typeof RIDER_SOS_RESPONSE_STATUSES)[number];

export type RiderSosResponseRow = {
  id: string;
  sos_event_id: string;
  responder_user_id: string;
  status: RiderSosResponseStatus;
  created_at: string;
  updated_at: string;
};

export type RiderSosResponderView = {
  id: string;
  responder_user_id: string;
  rider_name: string;
  bike_info: string | null;
  status: RiderSosResponseStatus;
  created_at: string;
  updated_at: string;
};
