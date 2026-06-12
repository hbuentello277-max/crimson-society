export const SOS_TYPES = [
  { value: "medical_emergency", label: "Medical Emergency" },
  { value: "crash", label: "Crash" },
  { value: "mechanical", label: "Mechanical Issue" },
  { value: "lost_separated", label: "Lost / Separated" },
  { value: "other", label: "Other" },
] as const;

export type SosType = (typeof SOS_TYPES)[number]["value"];

export type SosEventStatus = "active" | "resolved" | "cancelled";

export type RiderSosEventRow = {
  id: string;
  user_id: string;
  sos_type: SosType;
  status: SosEventStatus;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  bike_info: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

export function sosTypeLabel(value: string) {
  return SOS_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function formatMedicalSnapshot(input: {
  blood_type?: string | null;
  allergies?: string | null;
  medical_notes?: string | null;
}) {
  const parts = [
    input.blood_type?.trim() ? `Blood type: ${input.blood_type.trim()}` : null,
    input.allergies?.trim() ? `Allergies: ${input.allergies.trim()}` : null,
    input.medical_notes?.trim() || null,
  ].filter(Boolean) as string[];

  return parts.length > 0 ? parts.join("\n") : null;
}

export function buildMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function hasCompleteEmergencyProfile(input: {
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}) {
  return Boolean(input.emergency_contact_name?.trim() && input.emergency_contact_phone?.trim());
}
