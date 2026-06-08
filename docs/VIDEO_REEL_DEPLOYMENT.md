# Video Reel MVP — Deployment Notes

Limited-beta deployment checklist for reel upload, processing, playback, and cleanup.

## Beta limits (Hobby + Fluid Compute)

| Limit | Value |
|-------|-------|
| Max duration | **60 seconds maximum** |
| Max file size | **50 MB maximum** |
| Formats | MP4, MOV, WEBM |

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Authorizes Vercel Cron hits to `/api/cron/media-processing` (also accepts `PUSH_DISPATCH_SECRET` as fallback in code) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side media processing, storage cleanup on delete, and stale-job recovery |

Without `CRON_SECRET`, the media-processing cron returns **401** and only the post-create trigger (`POST /api/media/process` with `postId`) runs processing.

Without `SUPABASE_SERVICE_ROLE_KEY`, processing and delete cleanup routes fail at runtime.

## Vercel plan and function timeout

Processing routes set `maxDuration = 300` (5 minutes):

- `/api/cron/media-processing`
- `/api/media/process`

With **Fluid Compute** on **Hobby**, functions can run up to **300s** with **2 GB** memory and **1 vCPU** — sufficient for beta reels at **60s / 50MB** when cold starts are acceptable.

Without Fluid Compute on Hobby, the cap may be **60s** — align limits with staging transcode tests before inviting riders.

### Cron frequency on Hobby

`vercel.json` registers media processing every **2 minutes** (`*/2 * * * *`). **Hobby allows daily crons only**; sub-daily schedules require **Pro** or an external scheduler with `CRON_SECRET`. Immediate processing after upload (`POST /api/media/process` with `postId`) still works on Hobby.

## Cron schedule

`vercel.json` registers `/api/cron/media-processing` every **2 minutes** as a backup when immediate processing fails (Pro or external cron).

## Database migration

Apply on deploy:

- `supabase/migrations/20260606120000_video_reel_metadata.sql` — adds `video_duration_seconds`, `video_width`, `video_height` to `Posts`

## Storage bucket limit (not applied automatically)

App code enforces **50 MB maximum** uploads. The `media-originals` bucket may still allow larger files at the storage layer until the SQL below is run **with explicit approval**:

```sql
update storage.buckets
set file_size_limit = 52428800
where id = 'media-originals';
```

(`52428800` = 50 × 1024 × 1024 bytes.)

## Stale job recovery

Before each processing batch, jobs stuck in `processing` for more than **15 minutes** are:

- requeued (if `attempts < 3`), or
- marked `failed` on the job and post (if `attempts >= 3`)

Cron and authenticated per-post processing both run this recovery step.

## Smoke test after deploy

1. Upload a short MP4 reel (&lt;30s) from `/create`.
2. Confirm `media_processing_jobs` row is `queued` → `processing` → `ready`.
3. Confirm `Posts.video_playback_url` and `video_thumbnail_url` populate.
4. Confirm dashboard feed plays the reel and pauses off-screen.
5. Delete the post and verify originals/renders are removed from storage.
