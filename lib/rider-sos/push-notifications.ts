import { formatSosDistanceMiles } from "@/lib/rider-sos/nearby-format";
import { sosTypeLabel } from "@/lib/rider-sos/sos-types";

export const RIDER_SOS_NOTIFICATION_TYPES = [
  "sos_activated",
  "sos_responded",
  "sos_arrived",
] as const;

export type RiderSosNotificationType = (typeof RIDER_SOS_NOTIFICATION_TYPES)[number];

export function riderSosAlertPath(alertId: string) {
  return `/rider-sos/alerts/${alertId}`;
}

export function riderSosNotificationGroupKey(
  alertId: string,
  eventType: RiderSosNotificationType,
  recipientUserId: string,
) {
  return `rider_sos:${eventType}:${alertId}:${recipientUserId}`;
}

export function riderSosNotificationIdempotencyKey(
  alertId: string,
  eventType: RiderSosNotificationType,
  recipientUserId: string,
) {
  return riderSosNotificationGroupKey(alertId, eventType, recipientUserId);
}

export function buildSosActivatedPushCopy(input: {
  sosType: string;
  distanceMiles: number | null | undefined;
}) {
  return {
    title: "🚨 Rider Needs Assistance",
    body: `${sosTypeLabel(input.sosType)} · ${formatSosDistanceMiles(input.distanceMiles)}`,
  };
}

export function buildSosRespondedPushCopy(responderName: string) {
  const name = responderName.trim() || "A rider";
  return {
    title: "🚨 Help Is Responding",
    body: `${name} is responding to your SOS`,
  };
}

export function buildSosArrivedPushCopy(responderName: string) {
  const name = responderName.trim() || "A rider";
  return {
    title: "✅ Help Arrived",
    body: `${name} marked arrived`,
  };
}

