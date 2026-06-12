"use client";

import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { resolvePushNotificationPath } from "@/lib/notifications/push-url-resolve";
import { getConfiguredAppOrigin } from "@/lib/native/app-domains";
type NativePushPermissionState = NotificationPermission | "unsupported" | "default";

let cachedNativePermission: NativePushPermissionState = "default";
let cachedNativeToken: string | null = null;
let listenersInitialized = false;

export function isNativeIosPush() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function isNativeIosPushSupported() {
  return isNativeIosPush();
}

export function getNativeIosPushPermissionState(): NativePushPermissionState {
  if (!isNativeIosPush()) {
    return "unsupported";
  }

  return cachedNativePermission;
}

export function getCachedNativeIosPushToken() {
  return cachedNativeToken;
}

async function refreshNativeIosPushPermission() {
  if (!isNativeIosPush()) {
    cachedNativePermission = "unsupported";
    return cachedNativePermission;
  }

  try {
    const result = await PushNotifications.checkPermissions();
    cachedNativePermission = result.receive === "granted"
      ? "granted"
      : result.receive === "denied"
        ? "denied"
        : "default";
  } catch {
    cachedNativePermission = "unsupported";
  }

  return cachedNativePermission;
}

export function resolveNativePushTapUrl(data: Record<string, string | undefined>) {
  const direct = data.targetUrl?.trim() || data.url?.trim();
  if (direct) {
    return direct;
  }

  const path = resolvePushNotificationPath(data);
  if (!path) {
    return null;
  }

  const origin = getConfiguredAppOrigin().replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function initializeNativeIosPushListeners(onDeepLink: (url: string) => void) {
  if (!isNativeIosPush() || listenersInitialized) {
    return;
  }

  listenersInitialized = true;

  void refreshNativeIosPushPermission();

  const handles: PluginListenerHandle[] = [];

  void PushNotifications.addListener("registration", (token) => {
    cachedNativeToken = token.value;
  }).then((handle) => handles.push(handle));

  void PushNotifications.addListener("registrationError", () => {
    cachedNativeToken = null;
  }).then((handle) => handles.push(handle));

  void PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
    const data = (event.notification.data ?? {}) as Record<string, string | undefined>;
    const target = resolveNativePushTapUrl(data);
    if (target) {
      onDeepLink(target);
    }
  }).then((handle) => handles.push(handle));

  return () => {
    void Promise.all(handles.map((handle) => handle.remove()));
    listenersInitialized = false;
  };
}

export async function obtainNativeIosPushToken() {
  if (!isNativeIosPush()) {
    throw new Error("Native iOS push is not available on this device.");
  }

  if (cachedNativeToken) {
    return cachedNativeToken;
  }

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt") {
    permission = await PushNotifications.requestPermissions();
  }

  await refreshNativeIosPushPermission();

  if (permission.receive !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const token = await new Promise<string>((resolve, reject) => {
    let registrationHandle: PluginListenerHandle | null = null;
    let errorHandle: PluginListenerHandle | null = null;

    const cleanup = async () => {
      await registrationHandle?.remove();
      await errorHandle?.remove();
    };

    void PushNotifications.addListener("registration", (event) => {
      cachedNativeToken = event.value;
      void cleanup().then(() => resolve(event.value));
    }).then((handle) => {
      registrationHandle = handle;
    });

    void PushNotifications.addListener("registrationError", (event) => {
      void cleanup().then(() => reject(new Error(event.error)));
    }).then((handle) => {
      errorHandle = handle;
    });

    void PushNotifications.register();
  });

  return token;
}
