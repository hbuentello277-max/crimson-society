/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

let messagingReady = false;
const LOG_PREFIX = "[crimson-push]";

function logPush(phase, details) {
  console.info(LOG_PREFIX, phase, details || {});
}

function normalizeMessageDeepLinkPath(path) {
  const match = String(path || "").match(/^\/messages\/([^/?#]+)/);
  if (!match || !match[1]) return path;
  return `/inbox?conversation=${encodeURIComponent(match[1])}`;
}

function resolveNotificationPath(data) {
  const raw =
    data?.targetUrl ||
    data?.url ||
    (data?.requestId ? `/connect/requests/${data.requestId}` : null) ||
    (data?.orderId ? `/profile/orders/${data.orderId}` : null) ||
    (data?.conversationId ? `/messages/${data.conversationId}` : null) ||
    (data?.rideId
      ? data?.type === "meet_chat_message" || data?.type === "meet_chat_photo"
        ? `/meets/${data.rideId}?section=chat`
        : `/meets/${data.rideId}`
      : null) ||
    (data?.postId
      ? data?.commentId
        ? `/dashboard?post=${data.postId}&comment=${data.commentId}`
        : `/dashboard?post=${data.postId}`
      : null) ||
    (data?.actorUsername ? `/profile/${data.actorUsername}` : null);

  if (!raw) {
    if (data?.type === "direct_message") return "/inbox";
    if (data?.type === "admin_low_inventory" || String(data?.type || "").startsWith("admin_order")) {
      return "/admin/shop";
    }
    if (String(data?.type || "").startsWith("meet_")) return "/meets";
    if (String(data?.type || "").startsWith("order_")) return "/profile/orders";
    return "/inbox?tab=notifications";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return "/inbox?tab=notifications";
    }
  }

  return raw.startsWith("/") ? raw : `/${raw}`;
}

function resolveNotificationUrl(data) {
  const path = normalizeMessageDeepLinkPath(resolveNotificationPath(data || {}));
  return new URL(path, self.location.origin).toString();
}

function buildNotificationData(payloadData) {
  const path = normalizeMessageDeepLinkPath(resolveNotificationPath(payloadData || {}));
  const url = new URL(path, self.location.origin).toString();

  return {
    ...(payloadData || {}),
    url,
    targetUrl: payloadData?.targetUrl || url,
  };
}

function showNotification(payload) {
  const title = payload.notification?.title || payload.data?.title || "Crimson Society";
  const body = payload.notification?.body || payload.data?.body || "";
  const notificationData = buildNotificationData(payload.data || {});
  const tag =
    notificationData.groupKey ||
    notificationData.group_key ||
    notificationData.collapseKey ||
    notificationData.notificationId ||
    notificationData.type ||
    "crimson-default";

  logPush("show-notification", {
    type: notificationData.type,
    url: notificationData.url,
    conversationId: notificationData.conversationId,
  });

  return self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    renotify: true,
    data: notificationData,
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification?.data || {};
  const targetUrl = data.url || resolveNotificationUrl(data);

  logPush("notificationclick", {
    type: data.type,
    conversationId: data.conversationId,
    targetUrl,
    hasStoredUrl: !!data.url,
  });

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          const nextUrl = targetUrl.startsWith(self.location.origin)
            ? targetUrl.slice(self.location.origin.length) || "/"
            : targetUrl;

          logPush("notificationclick-focus-existing-client", { nextUrl });

          if ("navigate" in client) {
            client.navigate(nextUrl);
          }
          return client.focus();
        }
      }

      logPush("notificationclick-open-window", { targetUrl });

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});

fetch("/api/push/config")
  .then((response) => response.json())
  .then((config) => {
    if (!config?.configured || !config?.firebase) {
      return;
    }

    firebase.initializeApp(config.firebase);
    const messaging = firebase.messaging();
    messagingReady = true;

    messaging.onBackgroundMessage((payload) => {
      showNotification(payload);
    });
  })
  .catch(() => {
    // Push config is optional until Firebase env vars are provisioned.
  });

self.addEventListener("push", (event) => {
  if (messagingReady || !event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    event.waitUntil(showNotification(payload));
  } catch {
    // Ignore malformed payloads.
  }
});
