# Video Reel MVP — Deployment Notes

Limited-beta deployment checklist for reel upload, processing, playback, and cleanup.

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

**Vercel Pro (or Enterprise)** is required for 300s execution. On **Hobby**, the cap is **60 seconds** (often less in practice), which may be insufficient for worst-case beta uploads (up to **90s / 100MB** reels with ffmpeg transcode).

### If you are not on Pro

1. Run a staging test with a realistic 90s reel before inviting riders.
2. If transcodes time out, either:
   - upgrade to Pro for 300s functions, or
   - lower beta limits (shorter max duration / smaller max size), or
   - move processing to an external worker (not in MVP scope).

## Cron schedule

`vercel.json` registers `/api/cron/media-processing` every **2 minutes** as a backup when immediate processing fails.

**Hobby** allows only **2** cron jobs per project. This repo defines **3** (shop expire, push dispatch, media processing). Confirm your Vercel plan or consolidate crons before deploy.

## Database migration

Apply on deploy:

- `supabase/migrations/20260606120000_video_reel_metadata.sql` — adds `video_duration_seconds`, `video_width`, `video_height` to `Posts`

## Storage bucket limit (not applied automatically)

App code enforces **100MB** uploads. The `media-originals` bucket may still allow larger files at the storage layer until the SQL below is run **with explicit approval**:

```sql
update storage.buckets
set file_size_limit = 104857600
where id = 'media-originals';
```

(`104857600` = 100 × 1024 × 1024 bytes.)

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
