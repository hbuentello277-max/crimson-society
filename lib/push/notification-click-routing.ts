import {
  resolvePushNotificationPath,
  resolvePushNotificationUrl,
  type PushUrlData,
} from "@/lib/notifications/push-url-resolve";

export type NotificationClickData = PushUrlData & {
  url?: string | null;
  groupKey?: string | null;
  group_key?: string | null;
  notificationId?: string | null;
};

export type NotificationClickResolution = {
  path: string;
  absoluteUrl: string;
  source: "url" | "targetUrl" | "resolved" | "fallback";
};

const LOG_PREFIX = "[crimson-push]";

export function logNotificationClickRouting(
  phase: string,
  details: Record<string, unknown>,
) {
  if (typeof console === "undefined") return;
  console.info(LOG_PREFIX, phase, details);
}

/** Resolve in-app path from service worker / FCM notification data. */
export function resolveNotificationClickTarget(
  data: NotificationClickData,
  origin: string,
): NotificationClickResolution {
  const trimmedUrl = data.url?.trim() || data.targetUrl?.trim() || "";

  if (trimmedUrl) {
    try {
      const parsed = new URL(trimmedUrl, origin);
      const sameOrigin = parsed.origin === origin.replace(/\/$/, "");
      const path = sameOrigin
        ? `${parsed.pathname}${parsed.search}${parsed.hash}`
        : trimmedUrl;

      logNotificationClickRouting("resolve-from-url", { trimmedUrl, path });

      return {
        path: path.startsWith("/") ? path : resolvePushNotificationPath(data) || "/inbox",
        absoluteUrl: sameOrigin
          ? `${origin.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`
          : trimmedUrl,
        source: data.url?.trim() ? "url" : "targetUrl",
      };
    } catch {
      // Fall through to path resolver.
    }
  }

  const path = resolvePushNotificationPath(data) || "/inbox?tab=notifications";
  const absoluteUrl = resolvePushNotificationUrl(data, origin);

  logNotificationClickRouting("resolve-from-payload", { path, absoluteUrl, type: data.type });

  return {
    path,
    absoluteUrl,
    source: path === "/inbox?tab=notifications" ? "fallback" : "resolved",
  };
}

/** Normalize message deep links to inbox conversation route (client inbox UI). */
export function normalizeMessageDeepLinkPath(path: string): string {
  const match = path.match(/^\/messages\/([^/?#]+)/);
  if (!match?.[1]) return path;
  return `/inbox?conversation=${encodeURIComponent(match[1])}`;
}

export function buildNotificationClickData(
  payloadData: NotificationClickData,
  origin: string,
): NotificationClickData & { url: string } {
  const resolution = resolveNotificationClickTarget(payloadData, origin);
  const normalizedPath = normalizeMessageDeepLinkPath(resolution.path);

  return {
    ...payloadData,
    url: `${origin.replace(/\/$/, "")}${normalizedPath}`,
    targetUrl: `${origin.replace(/\/$/, "")}${normalizedPath}`,
    conversationId:
      payloadData.conversationId ||
      normalizedPath.match(/conversation=([^&]+)/)?.[1] ||
      payloadData.conversationId ||
      "",
  };
}
