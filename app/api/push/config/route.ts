import { NextResponse } from "next/server";
import { getFirebasePublicConfig, getFirebaseVapidKey } from "@/lib/push/firebase-public";
import { isFcmServerConfigured } from "@/lib/push/fcm-server";

export async function GET() {
  const firebase = getFirebasePublicConfig();
  const vapidKey = getFirebaseVapidKey();

  return NextResponse.json({
    configured: Boolean(firebase && vapidKey),
    firebase,
    vapidKey: vapidKey || null,
    serverConfigured: isFcmServerConfigured(),
  });
}
