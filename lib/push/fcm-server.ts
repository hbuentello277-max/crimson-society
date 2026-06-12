import { createSign } from "crypto";
import type { NotificationType } from "@/lib/notifications";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type PushPayload = {
  title: string;
  body: string;
  url: string;
  notificationId: string;
  type: NotificationType;
  rideId?: string | null;
  conversationId?: string | null;
  collapseKey?: string | null;
  requestId?: string | null;
  actorUserId?: string | null;
  actorUsername?: string | null;
  targetUrl?: string | null;
  entityId?: string | null;
  postId?: string | null;
  orderId?: string | null;
  groupKey?: string | null;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getServiceAccount(): ServiceAccount | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as ServiceAccount;
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        return {
          ...parsed,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function getAccessToken(account: ServiceAccount) {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60_000) {
    return cachedAccessToken.token;
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const issuedAt = Math.floor(now / 1000);
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      sub: account.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: issuedAt,
      exp: issuedAt + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    }),
  );

  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(account.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`FCM auth failed: ${errorText}`);
  }

  const tokenJson = (await tokenResponse.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: tokenJson.access_token,
    expiresAt: now + tokenJson.expires_in * 1000,
  };

  return tokenJson.access_token;
}

export function isFcmServerConfigured() {
  return getServiceAccount() !== null;
}

export async function sendFcmToToken(token: string, payload: PushPayload) {
  const account = getServiceAccount();
  if (!account) {
    throw new Error("FCM server credentials are not configured.");
  }

  const accessToken = await getAccessToken(account);

  const collapseKey = payload.collapseKey?.trim() || payload.notificationId;
  const deepLink = payload.targetUrl?.trim() || payload.url;

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          data: {
            title: payload.title,
            body: payload.body,
            url: payload.url,
            notificationId: payload.notificationId,
            type: payload.type,
            rideId: payload.rideId || "",
            conversationId: payload.conversationId || "",
            collapseKey,
            requestId: payload.requestId || "",
            actorUserId: payload.actorUserId || "",
            actorUsername: payload.actorUsername || "",
            targetUrl: payload.targetUrl || payload.url,
            entityId: payload.entityId || "",
            postId: payload.postId || "",
            orderId: payload.orderId || "",
            groupKey: payload.groupKey || collapseKey,
            group_key: payload.groupKey || collapseKey,
          },
          notification: {
            title: payload.title,
            body: payload.body,
          },
          android: {
            collapse_key: collapseKey,
            notification: {
              title: payload.title,
              body: payload.body,
            },
          },
          apns: {
            headers: {
              "apns-priority": "10",
              "apns-collapse-id": collapseKey.slice(0, 64),
            },
            payload: {
              aps: {
                alert: {
                  title: payload.title,
                  body: payload.body,
                },
                sound: "default",
              },
            },
            fcm_options: {
              link: deepLink,
            },
          },
          webpush: {
            notification: {
              title: payload.title,
              body: payload.body,
            },
            fcm_options: {
              link: payload.url,
            },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "FCM send failed");
  }

  return response.json();
}

export function isInvalidFcmTokenError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("UNREGISTERED") ||
    message.includes("INVALID_ARGUMENT") ||
    message.includes("NOT_FOUND")
  );
}
