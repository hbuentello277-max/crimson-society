import { NextResponse } from "next/server";
import { getFirebasePublicConfig, getFirebaseVapidKey } from "@/lib/push/firebase-public";
import { isFcmServerConfigured } from "@/lib/push/fcm-server";
import { getPushProductionReadiness } from "@/lib/push/production-readiness";

export async function GET() {
  const firebase = getFirebasePublicConfig();
  const vapidKey = getFirebaseVapidKey();
  const readiness = getPushProductionReadiness();

  return NextResponse.json({
    configured: Boolean(firebase && vapidKey),
    firebase,
    vapidKey: vapidKey || null,
    serverConfigured: isFcmServerConfigured(),
    readiness,
    dispatch: {
      endpoint: "/api/push/dispatch",
      cronEndpoint: "/api/cron/push-dispatch",
      cronSchedule: "*/2 * * * *",
    },
  });
}
