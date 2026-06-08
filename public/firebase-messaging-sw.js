/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js");

let messagingReady = false;

function showNotification(payload) {
  const title = payload.notification?.title || payload.data?.title || "Crimson Society";
  const body = payload.notification?.body || payload.data?.body || "";
  const url = payload.data?.url || payload.fcmOptions?.link || "/inbox?tab=notifications";
  const tag =
    payload.data?.collapseKey ||
    payload.data?.notificationId ||
    payload.data?.type ||
    "crimson-default";

  return self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    renotify: true,
    data: { url },
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/inbox?tab=notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

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
