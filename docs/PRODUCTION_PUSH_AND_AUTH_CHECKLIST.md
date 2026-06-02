# Production checklist: email verification + push delivery

## Email verification

| Step | Status |
|------|--------|
| Supabase **Confirm email** enabled | Manual (Dashboard) |
| **Site URL** = production domain | Manual |
| **Redirect URLs** include `{origin}/auth/callback` | Manual |
| App callback routes incomplete → setup, complete → dashboard | In repo |
| Local redirect `http://localhost:3000/auth/callback` | Manual |

See `docs/EMAIL_VERIFICATION_SETUP.md`.

---

## Push notifications — environment variables

### Required for web push delivery

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Admin client |
| `SUPABASE_SERVICE_ROLE_KEY` | Dispatch + token storage |
| `NEXT_PUBLIC_APP_URL` | Deep links in push payload |
| `PUSH_DISPATCH_SECRET` | Authorize `/api/push/dispatch` and cron |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client FCM |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client FCM |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client FCM |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client FCM |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client FCM |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client FCM |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Web push subscription |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server FCM send (or split `FIREBASE_*` vars) |

### Optional

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Vercel Cron `Authorization: Bearer` (can equal `PUSH_DISPATCH_SECRET`) |

Check runtime: `GET /api/push/config` returns `readiness` with `missing[]`.

---

## Push dispatch pipeline (automatic)

Three layers (use at least one; recommended: **1 + 3**):

### 1. Immediate — Supabase `pg_net` (migration)

After migration `20260603120000_push_dispatch_http_trigger.sql`, run in SQL Editor:

```sql
update public.push_dispatch_config
set
  dispatch_url = 'https://YOUR_DOMAIN/api/push/dispatch',
  dispatch_secret = 'YOUR_PUSH_DISPATCH_SECRET',
  enabled = true,
  updated_at = now()
where singleton = true;
```

Requires **pg_net** extension (enabled by migration).

### 2. Per-job — Supabase Database Webhook (Dashboard)

- **Table:** `push_notification_jobs`
- **Event:** INSERT
- **URL:** `https://YOUR_DOMAIN/api/push/dispatch`
- **Header:** `x-push-dispatch-secret: YOUR_PUSH_DISPATCH_SECRET`
- **Body:** `{ "notification_id": "{{ record.notification_id }}" }`

### 3. Backup — Vercel Cron (`vercel.json`)

- Path: `/api/cron/push-dispatch` every 2 minutes
- Set `CRON_SECRET` or `PUSH_DISPATCH_SECRET` in Vercel env
- Vercel sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set

Manual sweep:

```bash
curl -X POST "https://YOUR_DOMAIN/api/push/dispatch" \
  -H "Content-Type: application/json" \
  -H "x-push-dispatch-secret: $PUSH_DISPATCH_SECRET" \
  -d '{"process_pending": true, "limit": 50}'
```

---

## PWA readiness (installed web app)

### iOS (16.4+)

| Requirement | Notes |
|-------------|--------|
| Add to Home Screen | Required for web push |
| HTTPS production domain | Required |
| Firebase domain authorized | Firebase Console |
| User taps **Enable notifications** | Inbox → Notifications (existing UI; not modified) |
| `manifest` + icons | `app/manifest.ts`, `/icon-192.png`, `/icon-512.png` |

Limitations: no native APNs; badge/silent push limited vs native app.

### Android (Chrome installed PWA)

| Requirement | Notes |
|-------------|--------|
| Install PWA or use Chrome | FCM web push |
| Notification permission | User-initiated enable |
| Service worker | `public/firebase-messaging-sw.js` |

---

## App Store / Google Play (native)

**Not in this repo.** Store apps need Capacitor/RN + native push (APNs + FCM native SDKs), separate binaries, and store billing/privacy forms. Current stack targets **PWA + FCM web**.

---

## Verify in production

1. `GET /api/push/config` → `readiness.readyForWebPush: true`
2. Enable push on a test device (Inbox → Notifications)
3. Trigger in-app notification (DM, follow, meet event)
4. Confirm `push_notification_jobs` → `sent` and device receives push
5. Sign up new user → email link → `/profile/setup`
6. Existing complete user → email link or login → `/dashboard`
