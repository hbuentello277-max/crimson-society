# Push Notifications Setup (Web / FCM)

Crimson Society uses **Firebase Cloud Messaging (FCM)** for device push. In-app notifications in `public.notifications` remain the source of truth; push is a delivery layer on top.

## Audit answers

| Question | Answer |
|----------|--------|
| Service worker today? | **Added:** `public/firebase-messaging-sw.js` |
| Device push tokens stored? | **Added:** `public.user_push_tokens` |
| Firebase configured? | **Client + server helpers added;** requires env vars in deploy |
| In-app notifications | Unchanged; DB triggers still insert `notifications` rows |

## Architecture

1. App event → Postgres trigger inserts `notifications` row (existing).
2. `enqueue_push_notification_job` trigger inserts `push_notification_jobs` row.
3. **Supabase Database Webhook** (or cron) POSTs to `/api/push/dispatch` with `PUSH_DISPATCH_SECRET`.
4. Next.js server loads tokens + sends FCM HTTP v1 (service account, server-only).
5. Service worker shows background notification; tap opens deep link.

## Target events (mapped)

| Event | In-app `type` | Push |
|-------|----------------|------|
| New message | `direct_message` | Yes (new trigger on `messages`) |
| New follower | `profile_followed` | Yes |
| Rider joined meet | `meet_joined` | Yes |
| Rider removed | `meet_removed` | Yes |
| Meet canceled | `meet_canceled` | Yes |
| Meet ended | `meet_ended` | Yes |
| Meet chat message | `meet_chat_message` | Yes |
| Meet chat photo | `meet_chat_photo` | Yes |

Blocks are enforced in existing notification triggers; push only fires for rows that were inserted.

## Environment variables

### Public (Vercel + local)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web app |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web app |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase web app |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web app |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web push key pair (Firebase Console → Cloud Messaging → Web Push certificates) |
| `NEXT_PUBLIC_APP_URL` | Deep link origin (e.g. `https://crimsonsociety.app`) |

### Server only (never expose to client)

| Variable | Purpose |
|----------|---------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Full JSON service account **or** use split vars below |
| `FIREBASE_PROJECT_ID` | If not using JSON blob |
| `FIREBASE_CLIENT_EMAIL` | If not using JSON blob |
| `FIREBASE_PRIVATE_KEY` | If not using JSON blob (escape newlines as `\n`) |
| `PUSH_DISPATCH_SECRET` | Shared secret for `/api/push/dispatch` |
| `SUPABASE_SERVICE_ROLE_KEY` | Already used; required for dispatch |
| `NEXT_PUBLIC_SUPABASE_URL` | Already used |

## Firebase Console

1. Create / open Firebase project linked to your web app.
2. Enable **Cloud Messaging**.
3. Generate a **Web Push** key pair (VAPID) → `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
4. Create a **Service account** with Firebase Admin / FCM permissions → server JSON.
5. Add your production domain under **Authorized domains**.

## Supabase

1. Apply migration: `supabase/migrations/20260602180000_push_notifications.sql`
2. **Database Webhook** (recommended):
   - Table: `push_notification_jobs`
   - Event: `INSERT`
   - URL: `https://<your-domain>/api/push/dispatch`
   - Header: `x-push-dispatch-secret: <PUSH_DISPATCH_SECRET>`
   - Body: `{ "notification_id": "{{ record.notification_id }}" }`
3. Optional backlog sweep (cron every 1–5 min):

```http
POST /api/push/dispatch
x-push-dispatch-secret: <secret>
Content-Type: application/json

{ "process_pending": true, "limit": 50 }
```

## iOS PWA limitations

- Push requires **Add to Home Screen** and opening the **installed PWA** (iOS 16.4+).
- Safari tabs alone do not receive web push.
- Permission prompts must be user-initiated (Enable notifications button).
- Badge / silent push / rich media are limited compared to native apps.

## Local testing

1. Set all env vars in `.env.local`.
2. Run HTTPS or `localhost` (FCM allows localhost).
3. Enable notifications from Inbox → Notifications tab.
4. Trigger an in-app notification (e.g. follow, meet join, DM).
5. Confirm webhook hits dispatch or call dispatch manually:

```bash
curl -X POST http://localhost:3000/api/push/dispatch \
  -H "Content-Type: application/json" \
  -H "x-push-dispatch-secret: $PUSH_DISPATCH_SECRET" \
  -d '{"notification_id":"<uuid>"}'
```

## What is not included

- Native iOS/Android store apps (FCM native SDKs).
- Automatic Supabase Edge Function deploy (Next.js dispatch route is the default).
- `pg_net` database HTTP (not enabled in repo); use Database Webhook instead.
