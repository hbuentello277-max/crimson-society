# Account Deletion Workflow

## User request

1. Rider opens **Profile → Settings → Safety → Request Account Deletion**.
2. App shows irreversibility warning and pending-review notice.
3. Insert into `account_deletion_requests` with `status = pending` (unique open request per user).
4. User may **cancel** while status is `pending`.

## Admin review

Statuses: `pending` → `reviewing` | `completed` | `canceled`

### Mark completed (automated)

- `account_deletion_requests.status = completed`
- `reviewed_at` / `reviewed_by` recorded
- `profiles.status = blocked` (disables in-app features)
- Supabase Auth user **banned** (`ban_duration` long-term) — sign-in disabled

### Not automated

- Auth user row **not** deleted
- Posts, messages, meets, garage, follows, reports, notifications **not** purged
- Storage media **not** bulk-deleted

## Manual follow-up (if required)

- Permanent auth user deletion via Supabase dashboard or admin script
- Content erasure subject to legal/safety retention policy
- Stripe/subscription cancellation if applicable

## App Store compliance summary

| Stage | User experience |
|-------|-----------------|
| Submit | Request queued; account may remain usable |
| Pending / reviewing | Status visible in profile settings |
| Completed | Sign-in blocked; profile blocked; records may remain |
| Canceled | User may submit again |
