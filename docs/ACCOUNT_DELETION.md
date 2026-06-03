# Account Deletion Workflow

## User request

1. Rider opens **Profile → Settings → Safety → Request Account Deletion**.
2. Rider types **DELETE** to confirm.
3. `POST /api/account/deletion-request` creates `account_deletion_requests` (`pending`), sets `profiles.status = deletion_pending`, and updates auth app metadata.
4. Client signs out and redirects to `/account-deletion`.
5. User may sign in again only for **deletion management** (`/deletion-pending`, `/account-deletion`, `/privacy`, `/support`).

## Cancel (user)

- While request is `pending`, user opens `/deletion-pending` and calls `POST /api/account/deletion-cancel`.
- Profile status restores from `previous_status` on the request row.

## Admin approval

Statuses: `pending` → `reviewing` | `completed` | `canceled`

### Approve (`completed`)

`PATCH /api/admin/deletion-requests` runs `executeAccountDeletion`:

1. Cancel active Stripe subscriptions (fails entire job if Stripe errors).
2. Hard-delete posts, media, garage, avatars, DMs, meet participation, social graph, push tokens.
3. Snapshot moderation reports; write `account_deletion_audit`.
4. `auth.admin.deleteUser` — removes Supabase Auth user (profile cascades).

### Admin cancel

Restores `profiles.status` from `previous_status` when still `deletion_pending`.

## Retention

- `user_reports` (with optional `reporter_snapshot`), `account_deletion_audit`, and completed `account_deletion_requests` rows.

## Public documentation

- `/account-deletion`
