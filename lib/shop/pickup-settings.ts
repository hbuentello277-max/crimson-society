export const LOCAL_PICKUP_SETTINGS_KEY = "local_pickup";

export type LocalPickupSettings = {
  name: string;
  area: string;
  public_preview: string;
  instructions: string;
  hours: string;
  contact_note: string;
};

export const DEFAULT_LOCAL_PICKUP_SETTINGS: LocalPickupSettings = {
  name: "Crimson Society Pickup",
  area: "San Antonio, TX",
  public_preview:
    "Local pickup in San Antonio. We'll send pickup details once your order is ready.",
  instructions:
    "We'll message you when your order is ready. Pickup details will be shown after confirmation.",
  hours: "By appointment only",
  contact_note: "Reply to your order confirmation email if you need to reschedule pickup.",
};

export function parseLocalPickupSettings(raw: unknown): LocalPickupSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_LOCAL_PICKUP_SETTINGS };
  }

  const record = raw as Record<string, unknown>;
  return {
    name: String(record.name ?? DEFAULT_LOCAL_PICKUP_SETTINGS.name).trim() || DEFAULT_LOCAL_PICKUP_SETTINGS.name,
    area: String(record.area ?? DEFAULT_LOCAL_PICKUP_SETTINGS.area).trim() || DEFAULT_LOCAL_PICKUP_SETTINGS.area,
    public_preview:
      String(record.public_preview ?? DEFAULT_LOCAL_PICKUP_SETTINGS.public_preview).trim() ||
      DEFAULT_LOCAL_PICKUP_SETTINGS.public_preview,
    instructions:
      String(record.instructions ?? DEFAULT_LOCAL_PICKUP_SETTINGS.instructions).trim() ||
      DEFAULT_LOCAL_PICKUP_SETTINGS.instructions,
    hours:
      String(record.hours ?? DEFAULT_LOCAL_PICKUP_SETTINGS.hours).trim() ||
      DEFAULT_LOCAL_PICKUP_SETTINGS.hours,
    contact_note:
      String(record.contact_note ?? DEFAULT_LOCAL_PICKUP_SETTINGS.contact_note).trim() ||
      DEFAULT_LOCAL_PICKUP_SETTINGS.contact_note,
  };
}

export function pickupPreviewText(settings: LocalPickupSettings = DEFAULT_LOCAL_PICKUP_SETTINGS) {
  return settings.public_preview;
}

export function pickupReadyDetailsText(
  settings: LocalPickupSettings,
  orderPickupNote?: string | null,
) {
  const parts = [
    settings.name,
    settings.area ? `Pickup location: ${settings.area}` : null,
    settings.instructions,
    settings.hours ? `Hours: ${settings.hours}` : null,
    settings.contact_note ? `Contact: ${settings.contact_note}` : null,
    orderPickupNote?.trim() ? `Pickup note: ${orderPickupNote.trim()}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

export function pickupReadyNotificationBody(
  shortOrderId: string,
  settings: LocalPickupSettings,
  orderPickupNote?: string | null,
) {
  const area = settings.area ? ` · ${settings.area}` : "";
  const note = orderPickupNote?.trim();
  if (note) {
    return `Your order #${shortOrderId} is ready for pickup${area}. ${note}`;
  }
  return `Your order #${shortOrderId} is ready for pickup${area}. Check your order for pickup details.`;
}
