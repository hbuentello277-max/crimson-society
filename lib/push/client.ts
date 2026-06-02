"use client";

import { supabase } from "@/lib/supabase";
import { getFirebasePublicConfig, getFirebaseVapidKey, isPushConfiguredOnClient } from "@/lib/push/firebase-public";

function detectPushPlatform(): "web" | "ios" | "android" {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

async function pushRegisterHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

export type PushPermissionState = NotificationPermission | "unsupported";

export function getPushPermissionState(): PushPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    isPushConfiguredOnClient()
  );
}

async function registerFirebaseServiceWorker() {
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  });

  await navigator.serviceWorker.ready;
  return registration;
}

export async function obtainWebPushToken() {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  await registerFirebaseServiceWorker();

  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);

  const supported = await isSupported();
  if (!supported) {
    throw new Error("Firebase messaging is not supported in this browser.");
  }

  const config = getFirebasePublicConfig();
  const vapidKey = getFirebaseVapidKey();
  if (!config || !vapidKey) {
    throw new Error("Firebase web push is not configured.");
  }

  const app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
  const messaging = getMessaging(app);
  const registration = await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Could not obtain a device push token.");
  }

  return token;
}

export async function registerPushTokenWithServer(token: string) {
  const response = await fetch("/api/push/register", {
    method: "POST",
    credentials: "include",
    headers: await pushRegisterHeaders(),
    body: JSON.stringify({
      token,
      platform: detectPushPlatform(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    const detail =
      payload?.error?.trim() ||
      (response.status === 401
        ? "Sign in again to save your push token."
        : `Could not save push token (HTTP ${response.status}).`);
    throw new Error(detail);
  }
}

export async function disablePushOnServer() {
  const response = await fetch("/api/push/register", {
    method: "DELETE",
    credentials: "include",
    headers: await pushRegisterHeaders(),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    const detail =
      payload?.error?.trim() ||
      (response.status === 401
        ? "Sign in again to update push settings."
        : `Could not disable push notifications (HTTP ${response.status}).`);
    throw new Error(detail);
  }
}

export async function enableDevicePush() {
  const token = await obtainWebPushToken();
  await registerPushTokenWithServer(token);
  return token;
}
