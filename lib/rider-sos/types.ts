export type RiderSosProfileRow = {
  user_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  relationship: string;
  blood_type: string | null;
  allergies: string | null;
  medical_notes: string | null;
  bike_info: string | null;
  location_sharing_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type RiderSosProfileInput = {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  relationship: string;
  blood_type: string;
  allergies: string;
  medical_notes: string;
  bike_info: string;
  location_sharing_enabled: boolean;
};
