"use client";

import { supabase } from "@/lib/supabase";
import { getFirebasePublicConfig, getFirebaseVapidKey, isPushConfiguredOnClient } from "@/lib/push/firebase-public";
import { savePushTokenRow, setPushNotificationsEnabled } from "@/lib/push/save-token";

function detectPushPlatform(): "web" | "ios" | "android" {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "web";
}

async function resolveAccessToken() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!userError && user) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    }
  }

  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError) {
    return null;
  }

  return refreshedSession?.access_token ?? null;
}

async function pushRegisterHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const accessToken = await resolveAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return { headers, hasBearer: Boolean(accessToken) };
}

type RegisterApiPayload = {
  ok?: boolean;
  error?: string;
  code?: string;
  hint?: string;
  authDetail?: string;
  debug?: {
    receivedAuthorizationHeader?: boolean;
    bearerTokenLength?: number;
    authMethod?: string;
    tokenUpsertError?: string;
  };
};

function formatRegisterFailure(
  payload: RegisterApiPayload | null,
  status: number,
  hasBearer: boolean,
) {
  const parts: string[] = [];

  if (payload?.code) {
    parts.push(`[${payload.code}]`);
  }

  if (payload?.error?.trim()) {
    parts.push(payload.error.trim());
  } else if (status === 401) {
    parts.push("Sign in again to save your push token.");
  } else {
    parts.push(`Push register failed (HTTP ${status}).`);
  }

  if (payload?.authDetail?.trim()) {
    parts.push(payload.authDetail.trim());
  }

  if (payload?.hint?.trim()) {
    parts.push(payload.hint.trim());
  }

  if (payload?.debug?.tokenUpsertError) {
    parts.push(payload.debug.tokenUpsertError);
  }

  if (!hasBearer) {
    parts.push("No session token was sent to the server.");
  }

  return parts.join(" ");
}

async function registerPushTokenDirect(token: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    throw new Error(
      userError?.message || "Sign in again to save your push token (no active session).",
    );
  }

  const saveResult = await savePushTokenRow(supabase, {
    userId: user.id,
    token,
    platform: detectPushPlatform(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });

  if (!saveResult.ok) {
    const hint = saveResult.hint ? ` ${saveResult.hint}` : "";
    throw new Error(`[DIRECT_SAVE] ${saveResult.message}${hint}`);
  }

  const { error: profileError } = await setPushNotificationsEnabled(supabase, user.id, true);
  if (profileError) {
    console.warn("[push] profile flag update failed:", profileError.message);
  }
}

async function registerPushTokenViaApi(token: string) {
  const { headers, hasBearer } = await pushRegisterHeaders();

  const response = await fetch("/api/push/register", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      token,
      platform: detectPushPlatform(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    }),
  });

  const payload = (await response.json().catch(() => null)) as RegisterApiPayload | null;

  if (!response.ok || payload?.ok === false) {
    throw new Error(formatRegisterFailure(payload, response.status, hasBearer));
  }
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
  try {
    await registerPushTokenViaApi(token);
    return;
  } catch (apiError) {
    const apiMessage = apiError instanceof Error ? apiError.message : String(apiError);

    try {
      await registerPushTokenDirect(token);
      return;
    } catch (directError) {
      const directMessage =
        directError instanceof Error ? directError.message : String(directError);
      throw new Error(`${apiMessage} Fallback: ${directMessage}`);
    }
  }
}

export async function disablePushOnServer() {
  const { headers } = await pushRegisterHeaders();

  const response = await fetch("/api/push/register", {
    method: "DELETE",
    credentials: "include",
    headers,
  });

  const payload = (await response.json().catch(() => null)) as RegisterApiPayload | null;

  if (!response.ok) {
    throw new Error(formatRegisterFailure(payload, response.status, Boolean(headers.Authorization)));
  }
}

export async function enableDevicePush() {
  const token = await obtainWebPushToken();
  await registerPushTokenWithServer(token);
  return token;
}
