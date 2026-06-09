# Vercel Cron Scheduling (Hobby vs Pro)

## Hobby plan constraint

Vercel **Hobby** only allows cron jobs that run **once per day**. Sub-daily expressions
(`*/2`, `*/5`, hourly, etc.) fail at deploy time and block production promotion.

All routes under `/api/cron/*` remain deployed and protected by `CRON_SECRET` (via
`lib/cron/auth.ts`). Only `vercel.json` scheduling changes on Hobby.

## Current daily schedule (UTC)

Configured in `vercel.json` for Hobby-compatible production deploys:

| Time (UTC) | Route |
|------------|-------|
| 08:00 | `/api/cron/media-processing` |
| 08:05 | `/api/cron/meet-reminders` |
| 08:10 | `/api/cron/push-dispatch` |
| 08:15 | `/api/cron/shop-expire-reservations` |
| 08:20 | `/api/cron/nexus/health-check` |
| 08:25 | `/api/cron/nexus/mission-health` |
| 08:30 | `/api/cron/nexus/metrics-rollup` |
| 08:35 | `/api/cron/nexus/alert-evaluation` |
| 08:40 | `/api/cron/nexus/observation-engine` |
| 08:45 | `/api/cron/nexus/command-suggestions` |
| 08:50 | `/api/cron/nexus/command-expiry` |

Hobby timing precision is hourly (±59 min), so jobs may not fire at the exact minute.

## Sub-daily jobs on Hobby

For higher frequency, use an **external scheduler** (e.g. cron-job.org, GitHub Actions,
Uptime Robot) to `POST` or `GET` the cron routes with:

```http
Authorization: Bearer <CRON_SECRET>
```

Do not remove `CRON_SECRET` from Vercel env. Route handlers are unchanged.

### Examples (external, not in `vercel.json`)

| Need | Suggested external cadence |
|------|----------------------------|
| Media processing backup | Every 2–5 minutes |
| Push dispatch | Every 1–2 minutes |
| Nexus health check | Every 5 minutes |
| Alert evaluation | Every 10 minutes |

## Vercel Pro

On **Pro**, `vercel.json` can use per-minute schedules again (e.g. `*/5 * * * *`).
Restore sub-daily entries when upgrading; keep daily fallbacks documented here for Hobby
rollbacks.

## Related docs

- `docs/VIDEO_REEL_DEPLOYMENT.md` — reel processing + `CRON_SECRET`
- `docs/PRODUCTION_PUSH_AND_AUTH_CHECKLIST.md` — push dispatch backup cron
