# PROJECT NEXUS — MARK I IMPLEMENTATION PLAN

**Status:** Plan only — no code in this document  
**Architecture basis:** Mark I Blueprint + Revision B Addendum (`docs/NEXUS_ARCHITECTURE_REVISION_B.md`)  
**Target route:** `/admin/nexus`  
**Access:** Platform owner only (`profiles.is_platform_owner = true`)

---

## Guiding Constraints

| # | Constraint | Enforcement |
|---|---|---|
| 1 | Phase 7 stability untouched | No edits to Phase 7 migrations, commerce RPCs, or `stripe_webhook_events` logic |
| 2 | Admin routes unchanged | URLs stay `/admin`, `/admin/credits`, etc.; behavior identical for staff |
| 3 | Owner-only access | Separate layout gate; admins without owner flag get 403/redirect |
| 4 | Read-only on core tables | Collectors use `SELECT`/`COUNT` only on `profiles`, `subscriptions`, `rides`, etc. |
| 5 | Writes to `nexus_*` only | Service role writes scoped to Nexus tables + `nexus_activity_log` |
| 6 | No AI execution | `lib/ai/*` stubs only; no LLM API calls |
| 7 | No automation execution | `lib/commands/executor.ts` stub throws; no external mutations |
| 8 | No rollback execution | `recommend.rollback` stored as suggestion; never triggers deploy |
| 9 | No dangerous mutations | No Stripe refunds, no deploy triggers, no profile/status changes |

---

## Critical Prerequisite: Admin Route Isolation

**Problem:** `app/admin/layout.tsx` currently requires `role === 'admin'`. A platform owner who is not an admin cannot reach `/admin/nexus`. An admin who is not the owner would pass the admin gate and reach Nexus pages.

**Solution:** Next.js route groups — URLs unchanged, layouts split.

```
app/admin/
  layout.tsx                    # MODIFY → passthrough (no auth gate)
  (staff)/
    layout.tsx                  # CREATE → move existing admin gate here
    page.tsx                    # MOVE from app/admin/page.tsx
    blackcard/page.tsx          # MOVE
    credits/page.tsx            # MOVE
    shop/page.tsx               # MOVE
    sounds/page.tsx             # MOVE
    rewards/page.tsx            # MOVE
  (nexus)/
    nexus/
      layout.tsx                # CREATE → owner gate
      page.tsx                  # CREATE
      ...sub-pages
```

Route groups `(staff)` and `(nexus)` do not appear in URLs. `/admin/credits` and `/admin/nexus` both work.

**This must be Step 1** before any Nexus UI or API is added.

---

## Exact Build Order

### PHASE 0 — Route Isolation (No Nexus code)

| Step | Task | Risk |
|---|---|---|
| 0.1 | Refactor admin route groups (see above) | Medium — touches admin layout |
| 0.2 | Smoke-test all existing `/admin/*` routes | — |
| 0.3 | Verify non-admin users still redirected from `/admin` | — |
| 0.4 | Verify `/admin/nexus` returns 404 or redirect (not yet built) | — |

---

### PHASE 1 — Database Foundation

| Step | Migration file | Contents |
|---|---|---|
| 1.1 | `supabase/migrations/20260701120000_nexus_owner_auth.sql` | `profiles.is_platform_owner`, `is_platform_owner(uuid)` function, extend privilege self-update trigger, seed `platform_settings` key `nexus_owner_user_ids` |
| 1.2 | `supabase/migrations/20260701130000_nexus_core_tables.sql` | `nexus_integrations`, `nexus_health_checks`, `nexus_events`, `nexus_activity_log` |
| 1.3 | `supabase/migrations/20260701140000_nexus_alerts_incidents.sql` | `nexus_alerts`, `nexus_incidents`, `nexus_alert_rules` |
| 1.4 | `supabase/migrations/20260701150000_nexus_metrics_memory_deployments.sql` | `nexus_metrics_snapshots`, `nexus_ai_memory`, `nexus_deployments` |
| 1.5 | `supabase/migrations/20260701160000_nexus_revision_b_tables.sql` | `nexus_observations`, `nexus_observation_events`, `nexus_observation_metrics`, `nexus_observation_alerts`, `nexus_commands`, `nexus_war_rooms`, `nexus_mission_workflows`, `nexus_mission_checks` |
| 1.6 | `supabase/migrations/20260701170000_nexus_rls_policies.sql` | RLS on all `nexus_*` tables; grants; revoke anon |
| 1.7 | `supabase/migrations/20260701180000_nexus_seed_data.sql` | 6 integrations, 11 mission workflows, 12 alert rules, 6 observation rules |

**Apply order:** 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 (strictly sequential)

**Post-migration manual step:** Set `is_platform_owner = true` for owner UUID(s) via service role (or use `NEXUS_OWNER_USER_IDS` env allowlist until column is set).

---

### PHASE 2 — Core Library (Auth, Types, Constants)

| Step | Files to CREATE | Purpose |
|---|---|---|
| 2.1 | `lib/nexus/types.ts` | All Nexus TypeScript types |
| 2.2 | `lib/nexus/constants.ts` | Slugs, severities, categories, env assertions |
| 2.3 | `lib/nexus/owner.ts` | `isPlatformOwner(profile)`, env allowlist fallback |
| 2.4 | `lib/nexus/auth.ts` | `requireOwnerSession()`, `createNexusServiceClient()` |
| 2.5 | `lib/nexus/client.ts` | Owner-authenticated fetch helper for UI |
| 2.6 | `lib/nexus/rate-limit.ts` | In-memory sliding window rate limiter |
| 2.7 | `lib/nexus/activity-log.ts` | `logNexusActivity()` helper |
| 2.8 | `lib/nexus/env.ts` | `assertNexusEnv()`, optional var warnings |

| Step | Files to MODIFY | Change |
|---|---|---|
| 2.9 | `lib/profile.ts` | Add `is_platform_owner?: boolean` to `AppProfile` type only |

**Do NOT modify:** `lib/admin-api.ts`, `components/AuthProvider.tsx` (no Nexus exposure to admin UI).

---

### PHASE 3 — Event Ingestion Layer

| Step | Files to CREATE | Purpose |
|---|---|---|
| 3.1 | `lib/events/ingest.ts` | Write to `nexus_events` (service role) |
| 3.2 | `lib/events/emit.ts` | Typed event emission helpers |
| 3.3 | `lib/events/processors/stripe-webhook.ts` | Read `stripe_webhook_events`, emit Nexus events (SELECT only) |
| 3.4 | `lib/events/processors/vercel-deploy.ts` | Normalize Vercel webhook payload → event |
| 3.5 | `lib/events/processors/github-push.ts` | Normalize GitHub webhook payload → event |
| 3.6 | `lib/events/processors/internal.ts` | Internal system events |

---

### PHASE 4 — System Health Engine

| Step | Files to CREATE | Purpose |
|---|---|---|
| 4.1 | `lib/monitoring/thresholds.ts` | Default threshold config |
| 4.2 | `lib/monitoring/probes/supabase.ts` | DB, auth, storage, realtime probes |
| 4.3 | `lib/monitoring/probes/stripe.ts` | API + webhook failure probe (read `stripe_webhook_events`) |
| 4.4 | `lib/monitoring/probes/github.ts` | Rate limit + repo probe |
| 4.5 | `lib/monitoring/probes/vercel.ts` | Project + deploy probe |
| 4.6 | `lib/monitoring/probes/resend.ts` | API + email failure probe (read `shop_order_email_events`) |
| 4.7 | `lib/monitoring/probes/crimson-society.ts` | App self-check (read cron timestamps, push queue) |
| 4.8 | `lib/monitoring/aggregator.ts` | Integration status + overall Nexus status |
| 4.9 | `lib/monitoring/engine.ts` | Orchestrate all probes, write health_checks + events |
| 4.10 | `lib/integrations/github.ts` | GitHub REST client (read-only) |
| 4.11 | `lib/integrations/vercel.ts` | Vercel REST client (read-only) |
| 4.12 | `lib/integrations/resend-health.ts` | Resend health client (read-only; distinct from `lib/email/resend.ts`) |

---

### PHASE 5 — Mission Health Engine

| Step | Files to CREATE | Purpose |
|---|---|---|
| 5.1 | `lib/mission-health/workflows.ts` | Workflow slug constants + config |
| 5.2 | `lib/mission-health/probes/db-signals.ts` | SELECT-only queries on core tables |
| 5.3 | `lib/mission-health/probes/synthetic.ts` | Storage upload probe (test bucket only) |
| 5.4 | `lib/mission-health/evaluator.ts` | Per-workflow status logic |
| 5.5 | `lib/mission-health/scoring.ts` | 0–100 mission score |
| 5.6 | `lib/mission-health/engine.ts` | Orchestrate workflow checks, write mission_checks + events |

**Read-only query targets (SELECT/COUNT only):**

| Workflow | Core tables read |
|---|---|
| `user.signup` | `profiles` |
| `user.login` | auth metadata via probe |
| `profile.setup` | `profiles` |
| `post.creation` | `"Posts"` |
| `meet.creation` | `rides` |
| `meet.joining` | `ride_attendees` |
| `messaging` | `messages` |
| `blackcard.purchase` | `subscriptions`, `stripe_customers` |
| `stripe.webhook` | `stripe_webhook_events` |
| `push.delivery` | `push_notification_jobs` |
| `media.upload` | `media_processing_jobs`, storage test bucket |

---

### PHASE 6 — Metrics Engine

| Step | Files to CREATE | Purpose |
|---|---|---|
| 6.1 | `lib/metrics/queries.ts` | Shared read-only Supabase queries |
| 6.2 | `lib/metrics/revenue.ts` | MRR, churn (from `subscriptions`) |
| 6.3 | `lib/metrics/growth.ts` | Signups, DAU (from `profiles`) |
| 6.4 | `lib/metrics/blackcard.ts` | Active, founding, conversion |
| 6.5 | `lib/metrics/rollup.ts` | Write `nexus_metrics_snapshots` |

---

### PHASE 7 — Alert Engine

| Step | Files to CREATE | Purpose |
|---|---|---|
| 7.1 | `lib/alerts/rules.ts` | Rule definitions |
| 7.2 | `lib/alerts/deduplication.ts` | Dedupe key generation |
| 7.3 | `lib/alerts/incident-manager.ts` | Auto-incident + war room trigger |
| 7.4 | `lib/alerts/engine.ts` | Process unprocessed events → alerts |

---

### PHASE 8 — Observation Engine (Revision B)

| Step | Files to CREATE | Purpose |
|---|---|---|
| 8.1 | `lib/observations/rules.ts` | 6 observation rule definitions |
| 8.2 | `lib/observations/evaluator.ts` | Rule evaluation over metrics/events |
| 8.3 | `lib/observations/deduplication.ts` | Dedupe + supersede logic |
| 8.4 | `lib/observations/engine.ts` | Create observations + junction refs |

---

### PHASE 9 — War Room Manager (Revision B)

| Step | Files to CREATE | Purpose |
|---|---|---|
| 9.1 | `lib/war-room/types.ts` | War room types |
| 9.2 | `lib/war-room/manager.ts` | Create/update/resolve war rooms |
| 9.3 | `lib/war-room/aggregator.ts` | Aggregate incident data for war room view |
| 9.4 | `lib/war-room/timeline.ts` | Merge timelines from events, alerts, notes |

---

### PHASE 10 — Command System (Revision B, Suggestions Only)

| Step | Files to CREATE | Purpose |
|---|---|---|
| 10.1 | `lib/commands/types.ts` | Command types |
| 10.2 | `lib/commands/allowlist.ts` | Permitted command types; block execution types |
| 10.3 | `lib/commands/schemas.ts` | Payload schemas per command_type |
| 10.4 | `lib/commands/suggestions.ts` | Generate suggestions from observations/alerts/war rooms |
| 10.5 | `lib/commands/engine.ts` | Create commands, state transitions |
| 10.6 | `lib/commands/executor.ts` | **STUB** — throws `"Automation disabled in Mark I"` |

---

### PHASE 11 — Memory Engine

| Step | Files to CREATE | Purpose |
|---|---|---|
| 11.1 | `lib/memory/templates.ts` | Memory entry templates |
| 11.2 | `lib/memory/milestones.ts` | Milestone detection rules |
| 11.3 | `lib/memory/retrieval.ts` | Query builder |
| 11.4 | `lib/memory/engine.ts` | Event → memory projection |

---

### PHASE 12 — AI Stubs (No Execution)

| Step | Files to CREATE | Purpose |
|---|---|---|
| 12.1 | `lib/ai/README.md` | Mark II expansion notes |
| 12.2 | `lib/ai/context-builder.ts` | Stub — exports types only |
| 12.3 | `lib/ai/prompt-templates.ts` | Stub — static template strings |
| 12.4 | `lib/ai/tool-registry.ts` | Stub — type definitions only |
| 12.5 | `lib/ai/safety.ts` | PII filter function (used for sanitizing evidence in logs) |

---

### PHASE 13 — Cron Routes

| Step | Files to CREATE | Schedule |
|---|---|---|
| 13.1 | `app/api/cron/nexus/health-check/route.ts` | `*/5 * * * *` |
| 13.2 | `app/api/cron/nexus/mission-health/route.ts` | `*/5 * * * *` |
| 13.3 | `app/api/cron/nexus/alert-engine/route.ts` | `*/2 * * * *` |
| 13.4 | `app/api/cron/nexus/observation-engine/route.ts` | `*/15 * * * *` |
| 13.5 | `app/api/cron/nexus/metrics-rollup/route.ts` | `0 * * * *` |
| 13.6 | `app/api/cron/nexus/memory-sync/route.ts` | `0 */6 * * *` |
| 13.7 | `app/api/cron/nexus/command-expiry/route.ts` | `0 4 * * *` |
| 13.8 | `app/api/cron/nexus/cleanup/route.ts` | `0 3 * * *` |

| Step | Files to MODIFY | Change |
|---|---|---|
| 13.9 | `vercel.json` | Add 8 Nexus cron entries (keep existing 2 crons unchanged) |

**All cron routes:** Use existing `lib/cron/auth.ts` → `isCronAuthorized(request)`. Do not modify `lib/cron/auth.ts`.

---

### PHASE 14 — Webhook Routes (Optional / Degraded)

| Step | Files to CREATE | Purpose |
|---|---|---|
| 14.1 | `app/api/webhooks/nexus/vercel/route.ts` | Vercel deploy webhook |
| 14.2 | `app/api/webhooks/nexus/github/route.ts` | GitHub push/PR webhook |

If `VERCEL_WEBHOOK_SECRET` / `GITHUB_WEBHOOK_SECRET` not configured, routes return 503 with log — no crash.

---

### PHASE 15 — Owner API Routes

| Step | Files to CREATE | Auth |
|---|---|---|
| 15.1 | `app/api/nexus/status/route.ts` | `requireOwnerSession()` |
| 15.2 | `app/api/nexus/health/route.ts` | owner |
| 15.3 | `app/api/nexus/dashboard/route.ts` | owner — batched dashboard payload |
| 15.4 | `app/api/nexus/topology/route.ts` | owner |
| 15.5 | `app/api/nexus/alerts/route.ts` | owner |
| 15.6 | `app/api/nexus/alerts/[id]/route.ts` | owner |
| 15.7 | `app/api/nexus/alerts/[id]/acknowledge/route.ts` | owner |
| 15.8 | `app/api/nexus/incidents/route.ts` | owner |
| 15.9 | `app/api/nexus/incidents/[id]/route.ts` | owner |
| 15.10 | `app/api/nexus/events/route.ts` | owner |
| 15.11 | `app/api/nexus/activity/route.ts` | owner |
| 15.12 | `app/api/nexus/metrics/route.ts` | owner |
| 15.13 | `app/api/nexus/metrics/revenue/route.ts` | owner |
| 15.14 | `app/api/nexus/metrics/growth/route.ts` | owner |
| 15.15 | `app/api/nexus/metrics/blackcard/route.ts` | owner |
| 15.16 | `app/api/nexus/memory/route.ts` | owner |
| 15.17 | `app/api/nexus/memory/timeline/route.ts` | owner |
| 15.18 | `app/api/nexus/deployments/route.ts` | owner |
| 15.19 | `app/api/nexus/integrations/route.ts` | owner |
| 15.20 | `app/api/nexus/integrations/[slug]/route.ts` | owner |
| 15.21 | `app/api/nexus/observations/route.ts` | owner |
| 15.22 | `app/api/nexus/observations/[id]/route.ts` | owner |
| 15.23 | `app/api/nexus/commands/route.ts` | owner |
| 15.24 | `app/api/nexus/commands/[id]/route.ts` | owner |
| 15.25 | `app/api/nexus/war-rooms/route.ts` | owner |
| 15.26 | `app/api/nexus/war-rooms/active/route.ts` | owner |
| 15.27 | `app/api/nexus/war-rooms/[id]/route.ts` | owner |
| 15.28 | `app/api/nexus/war-rooms/[id]/resolve/route.ts` | owner |
| 15.29 | `app/api/nexus/mission-health/route.ts` | owner |
| 15.30 | `app/api/nexus/mission-health/[slug]/route.ts` | owner |

**All owner routes:** `export const dynamic = "force-dynamic"`, `export const runtime = "nodejs"`.

**Write operations (owner session → service role → nexus_* only):**
- Alert acknowledge/resolve
- Incident update
- Observation dismiss/confirm
- Command approve/reject/complete/dismiss
- War room notes/resolution
- Manual memory create

---

### PHASE 16 — UI: Shell & Shared Components

| Step | Files to CREATE | Purpose |
|---|---|---|
| 16.1 | `components/nexus/NexusShell.tsx` | Layout, nav, ambient styling |
| 16.2 | `components/nexus/shared/NexusCard.tsx` | Glass card primitive |
| 16.3 | `components/nexus/shared/SeverityBadge.tsx` | Severity badges |
| 16.4 | `components/nexus/shared/StatusIndicator.tsx` | Pulsing health dot |
| 16.5 | `components/nexus/shared/MetricDelta.tsx` | Delta display |
| 16.6 | `components/nexus/shared/NexusTimestamp.tsx` | Relative time |
| 16.7 | `components/nexus/hooks/useNexusStatus.ts` | Poll status |
| 16.8 | `components/nexus/hooks/useNexusMetrics.ts` | Poll metrics |
| 16.9 | `components/nexus/hooks/useNexusDashboard.ts` | Poll batched dashboard |
| 16.10 | `hooks/nexus/useOwnerGate.ts` | Client-side owner check (redirect if not owner) |

---

### PHASE 17 — UI: Dashboard Panels

| Step | Files to CREATE | Panel |
|---|---|---|
| 17.1 | `components/nexus/panels/AiStatusPanel.tsx` | AI status (static "Mark II") |
| 17.2 | `components/nexus/panels/MissionHealthPanel.tsx` | Mission score + workflows |
| 17.3 | `components/nexus/panels/ObservationsPanel.tsx` | Active observations |
| 17.4 | `components/nexus/panels/WarRoomPanel.tsx` | Conditional crisis panel |
| 17.5 | `components/nexus/panels/SystemHealthGrid.tsx` | 6 integration grid |
| 17.6 | `components/nexus/panels/AlertsCenter.tsx` | Active alerts |
| 17.7 | `components/nexus/panels/CommandsPanel.tsx` | Pending/suggested commands |
| 17.8 | `components/nexus/panels/RevenueOverview.tsx` | Revenue metrics |
| 17.9 | `components/nexus/panels/BlackcardMetrics.tsx` | Blackcard metrics |
| 17.10 | `components/nexus/panels/UserGrowthPanel.tsx` | Growth metrics |
| 17.11 | `components/nexus/panels/LiveActivityFeed.tsx` | Activity stream |
| 17.12 | `components/nexus/panels/MemoryTimeline.tsx` | Memory timeline |
| 17.13 | `components/nexus/panels/IntegrationsStatus.tsx` | Integration pills |
| 17.14 | `components/nexus/topology/NetworkTopology.tsx` | System map |
| 17.15 | `components/nexus/topology/NexusNode.tsx` | Center node |
| 17.16 | `components/nexus/topology/IntegrationNode.tsx` | Satellite node |
| 17.17 | `components/nexus/war-room/WarRoomDetail.tsx` | Full war room view |
| 17.18 | `components/nexus/war-room/WarRoomTimeline.tsx` | War room timeline |

---

### PHASE 18 — UI: Pages

| Step | Files to CREATE | Route |
|---|---|---|
| 18.1 | `app/admin/(nexus)/nexus/layout.tsx` | Owner gate + NexusShell |
| 18.2 | `app/admin/(nexus)/nexus/page.tsx` | Main dashboard |
| 18.3 | `app/admin/(nexus)/nexus/alerts/page.tsx` | `/admin/nexus/alerts` |
| 18.4 | `app/admin/(nexus)/nexus/incidents/page.tsx` | `/admin/nexus/incidents` |
| 18.5 | `app/admin/(nexus)/nexus/incidents/[id]/page.tsx` | Incident detail |
| 18.6 | `app/admin/(nexus)/nexus/observations/page.tsx` | `/admin/nexus/observations` |
| 18.7 | `app/admin/(nexus)/nexus/commands/page.tsx` | `/admin/nexus/commands` |
| 18.8 | `app/admin/(nexus)/nexus/mission-health/page.tsx` | `/admin/nexus/mission-health` |
| 18.9 | `app/admin/(nexus)/nexus/memory/page.tsx` | `/admin/nexus/memory` |
| 18.10 | `app/admin/(nexus)/nexus/integrations/page.tsx` | `/admin/nexus/integrations` |
| 18.11 | `app/admin/(nexus)/nexus/integrations/[slug]/page.tsx` | Integration detail |
| 18.12 | `app/admin/(nexus)/nexus/war-room/[id]/page.tsx` | War room detail |

**Do NOT add** links to Nexus from `app/admin/(staff)/*`, `app/profile/page.tsx`, or `components/admin/*`.

---

### PHASE 19 — Final Hardening

| Step | Task |
|---|---|
| 19.1 | Run security checklist (below) |
| 19.2 | Run full testing checklist (below) |
| 19.3 | Verify no Nexus env vars required for app to boot (graceful degradation) |
| 19.4 | Update `docs/PRODUCTION_SMOKE_TEST.md` with Nexus smoke steps (optional) |

---

## Files to Modify (Complete List)

| File | Phase | Change |
|---|---|---|
| `app/admin/layout.tsx` | 0.1 | Remove auth gate; passthrough `children` |
| `app/admin/page.tsx` | 0.1 | MOVE → `app/admin/(staff)/page.tsx` |
| `app/admin/blackcard/page.tsx` | 0.1 | MOVE → `app/admin/(staff)/blackcard/page.tsx` |
| `app/admin/credits/page.tsx` | 0.1 | MOVE → `app/admin/(staff)/credits/page.tsx` |
| `app/admin/shop/page.tsx` | 0.1 | MOVE → `app/admin/(staff)/shop/page.tsx` |
| `app/admin/sounds/page.tsx` | 0.1 | MOVE → `app/admin/(staff)/sounds/page.tsx` |
| `app/admin/rewards/page.tsx` | 0.1 | MOVE → `app/admin/(staff)/rewards/page.tsx` |
| `vercel.json` | 13.9 | Add Nexus cron entries |
| `lib/profile.ts` | 2.9 | Add `is_platform_owner` to type |

**Explicitly do NOT modify:**

- Any `supabase/migrations/20260629*` (Phase 7) files
- `lib/admin-api.ts`
- `app/api/admin/*`
- `app/api/stripe/*`
- `components/AuthProvider.tsx`
- `components/admin/*`
- `lib/stripe/*`
- `lib/cron/auth.ts`

---

## Required Environment Variables

### Required for Nexus to function

| Variable | Purpose | Fallback if missing |
|---|---|---|
| `NEXUS_OWNER_USER_IDS` | Comma-separated owner UUIDs for bootstrap | Nexus UI inaccessible until `is_platform_owner` set in DB |
| `CRON_SECRET` | Cron auth (existing) | Cron routes return 401 |
| `SUPABASE_SERVICE_ROLE_KEY` | Service client (existing) | Nexus collectors fail |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL (existing) | Nexus fails |

### Optional (graceful degradation to `unknown`)

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | GitHub probes |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook verification |
| `GITHUB_REPO` | `owner/repo` for probes |
| `VERCEL_TOKEN` | Vercel probes |
| `VERCEL_WEBHOOK_SECRET` | Vercel webhook verification |
| `VERCEL_PROJECT_ID` | Vercel probe target |
| `STRIPE_SECRET_KEY` | Stripe probes (existing) |
| `RESEND_API_KEY` | Resend probes (existing) |

### Must NOT be added in Mark I

| Variable | Reason |
|---|---|
| `OPENAI_API_KEY` / any LLM key | No AI in Mark I |
| `NEXUS_AUTOMATION_ENABLED` | Mark IV only |

---

## Testing Checklist by Phase

### Phase 0 — Route Isolation

- [ ] `/admin` loads for active admin user
- [ ] `/admin/credits`, `/admin/shop`, `/admin/blackcard`, `/admin/sounds`, `/admin/rewards` all load
- [ ] Non-admin user visiting `/admin` redirected to `/profile`
- [ ] Suspended admin redirected to `/profile`
- [ ] No visual or navigational regressions in staff admin UI
- [ ] `git diff` shows only layout refactor — no logic changes in admin page components

### Phase 1 — Database

- [ ] All 7 migrations apply cleanly on fresh DB
- [ ] `is_platform_owner()` returns false for regular users
- [ ] `is_platform_owner()` returns true for seeded owner
- [ ] User cannot `UPDATE profiles SET is_platform_owner = true` on own row (trigger blocks)
- [ ] All `nexus_*` tables exist with RLS enabled
- [ ] `anon` role cannot SELECT from `nexus_*` tables
- [ ] Authenticated non-owner cannot SELECT from `nexus_*` tables
- [ ] Service role can INSERT/SELECT on all `nexus_*` tables
- [ ] Seed data: 6 integrations, 11 workflows, 12 alert rules present
- [ ] No changes to existing tables beyond `profiles.is_platform_owner` column

### Phase 2 — Core Library

- [ ] `requireOwnerSession()` returns 401 for unauthenticated
- [ ] `requireOwnerSession()` returns 403 for admin-without-owner
- [ ] `requireOwnerSession()` returns 403 for member
- [ ] `requireOwnerSession()` returns 403 for moderator
- [ ] `requireOwnerSession()` returns session for owner
- [ ] Rate limiter returns 429 after threshold

### Phase 3 — Event Ingestion

- [ ] `emit()` writes to `nexus_events` only
- [ ] Stripe processor reads `stripe_webhook_events` — no writes to that table
- [ ] Events have valid `category`, `severity`, `event_type`

### Phase 4 — System Health

- [ ] Health check cron returns 401 without `CRON_SECRET`
- [ ] Health check cron writes to `nexus_health_checks` and updates `nexus_integrations`
- [ ] Missing `GITHUB_TOKEN` → GitHub integration status `unknown`, not crash
- [ ] Probe failure emits `nexus_event` with correct severity
- [ ] No writes to any non-nexus table

### Phase 5 — Mission Health

- [ ] Mission health cron runs successfully
- [ ] All 11 workflows have status (healthy/degraded/failing/unknown)
- [ ] Mission score computed and stored in `nexus_metrics_snapshots`
- [ ] Core table queries are SELECT/COUNT only — verify in code review
- [ ] Synthetic storage probe uses test path only; cleans up after

### Phase 6 — Metrics

- [ ] Metrics rollup writes snapshots for revenue, growth, blackcard, mission score
- [ ] Metrics queries read-only on `profiles`, `subscriptions`
- [ ] No PII in snapshot `dimensions` or `metadata`

### Phase 7 — Alert Engine

- [ ] Unprocessed events get `processed = true` after engine runs
- [ ] Duplicate alerts not created (dedupe key works)
- [ ] Critical integration down → incident created
- [ ] Alert acknowledge writes to `nexus_alerts` + `nexus_activity_log` only

### Phase 8 — Observations

- [ ] Observation engine creates conclusions from metrics
- [ ] Junction tables link to source events/metrics
- [ ] Dismiss/confirm updates observation status only
- [ ] No AI `source` values in Mark I (only `rule_engine`, `collector`, `manual`)

### Phase 9 — War Rooms

- [ ] Critical incident auto-creates war room
- [ ] Mission score < 50 auto-creates war room
- [ ] Warning-only incident does NOT create war room
- [ ] War room resolve updates `nexus_war_rooms` only

### Phase 10 — Commands

- [ ] Suggestions created from observations/alerts
- [ ] `recommend.rollback` created with `risk_level = high`, `pending_approval`
- [ ] `executor.ts` throws if called
- [ ] Approve/reject/complete transitions logged in `nexus_activity_log`
- [ ] No external API calls on approve

### Phase 11 — Memory

- [ ] Memory entries created from deployments, incidents, milestones
- [ ] Manual memory create via API works for owner
- [ ] `embedding` column remains null

### Phase 13 — Crons

- [ ] All 8 Nexus crons registered in `vercel.json`
- [ ] Existing shop/push crons unchanged and still work
- [ ] Each cron returns 401 without secret
- [ ] Cleanup cron deletes health_checks > 30 days, mission_checks > 14 days

### Phase 14 — Webhooks

- [ ] Invalid signature returns 401
- [ ] Valid webhook creates `nexus_event` + optional `nexus_deployment`
- [ ] No webhook secrets → route returns 503, app still boots

### Phase 15 — Owner APIs

- [ ] Every `/api/nexus/*` route returns 401/403 for non-owner
- [ ] Admin (non-owner) gets 403 on all Nexus API routes
- [ ] `GET /api/nexus/dashboard` returns batched payload
- [ ] Write endpoints create audit log entries
- [ ] No endpoint writes outside `nexus_*` tables

### Phase 16–18 — UI

- [ ] `/admin/nexus` redirects non-owner to `/profile`
- [ ] Admin without owner flag cannot see Nexus (403/redirect)
- [ ] Owner sees all dashboard panels
- [ ] War Room panel hidden when no active war room
- [ ] War Room panel appears on critical incident
- [ ] No link to Nexus from staff admin or profile page
- [ ] Mobile layout: single column, no broken panels
- [ ] Commands approve/reject UI works; no side effects

---

## Rollback Plan

### Per-phase rollback

| Phase | Rollback action | Impact |
|---|---|---|
| 0 | Revert route group refactor; restore `app/admin/layout.tsx` gate | Immediate; no DB impact |
| 1.1 | Drop `is_platform_owner` column + function | Owner auth removed |
| 1.2–1.5 | `DROP TABLE` Nexus tables in reverse order | All Nexus data lost |
| 1.6 | Drop RLS policies | — |
| 1.7 | Delete seed rows | — |
| 2–12 | Delete `lib/nexus/`, `lib/monitoring/`, etc. | No runtime impact if routes removed |
| 13 | Remove cron routes + revert `vercel.json` | Collectors stop |
| 14 | Delete webhook routes | Deploy tracking stops |
| 15 | Delete `app/api/nexus/*` | API inaccessible |
| 16–18 | Delete `components/nexus/`, `app/admin/(nexus)/` | UI inaccessible |

### Full rollback (remove Nexus entirely)

1. Delete all `app/api/nexus/`, `app/api/cron/nexus/`, `app/api/webhooks/nexus/`
2. Delete `app/admin/(nexus)/`
3. Revert `app/admin/layout.tsx` and move staff pages back from `(staff)/`
4. Revert `vercel.json` crons
5. Delete `lib/nexus/`, `lib/monitoring/`, `lib/mission-health/`, `lib/alerts/`, `lib/observations/`, `lib/war-room/`, `lib/commands/`, `lib/memory/`, `lib/events/`, `lib/metrics/`, `lib/ai/`, `components/nexus/`, `hooks/nexus/`
6. Apply rollback migration: `supabase/migrations/20260701190000_nexus_rollback.sql` (create at rollback time — drops all nexus tables, removes `is_platform_owner`)

**Rollback safety:** Nexus is fully isolated. Rollback does not affect core app functionality, Stripe, admin, or member flows.

### Migration rollback order (reverse)

1.7 seed → 1.6 RLS → 1.5 Rev B → 1.4 metrics → 1.3 alerts → 1.2 core → 1.1 owner auth

---

## Security Checklist

### Authorization

- [ ] `is_platform_owner` cannot be self-set by users
- [ ] `requireOwnerSession()` used in every `/api/nexus/*` handler
- [ ] `isCronAuthorized()` used in every `/api/cron/nexus/*` handler
- [ ] Webhook routes verify HMAC before processing
- [ ] Admin layout does NOT grant Nexus access
- [ ] No Nexus link in staff admin UI or profile page

### RLS

- [ ] RLS enabled on every `nexus_*` table
- [ ] Owner SELECT policy uses `is_platform_owner(auth.uid())`
- [ ] No DELETE policies on any nexus table
- [ ] No INSERT/UPDATE policies for `authenticated` on collector-written tables
- [ ] `anon` has no grants on `nexus_*` tables

### Data isolation

- [ ] Collectors read core tables SELECT-only
- [ ] No collector writes to `profiles`, `subscriptions`, `rides`, `messages`, etc.
- [ ] Evidence/details JSON redacts emails, tokens, API keys
- [ ] Activity log captures IP + user agent on owner writes

### Command safety

- [ ] `lib/commands/executor.ts` is a stub that throws
- [ ] `recommend.rollback` never calls Vercel/GitHub deploy APIs
- [ ] `investigate.*` commands only navigate/filter — no mutations
- [ ] `platform_settings.nexus_automation_enabled` does not exist or is `false`

### Rate limiting

- [ ] Owner APIs rate-limited (60/min read, 20/min write)
- [ ] Webhook endpoints rate-limited (100/min)

### Secrets

- [ ] No secrets in `nexus_events.payload` or `nexus_health_checks.details`
- [ ] No secrets in API responses
- [ ] `NEXUS_OWNER_USER_IDS` is server-only (not `NEXT_PUBLIC_`)

### Phase 7 protection

- [ ] No modifications to Phase 7 migrations
- [ ] No modifications to commerce RPC grants
- [ ] `stripe_webhook_events` read-only from Nexus

---

## Final Acceptance Criteria

Mark I is **complete** when all of the following are true:

### Access control
1. Only `is_platform_owner = true` users can access `/admin/nexus` and `/api/nexus/*`
2. Admins, moderators, and members receive 403 or redirect
3. No Nexus navigation visible anywhere except within Nexus itself

### Monitoring
4. All 6 integrations probed every 5 minutes with status in dashboard
5. All 11 mission workflows checked with 0–100 mission score displayed
6. Overall Nexus status reflects both system health and mission health
7. Network topology displays integration health + mission score on Crimson Society node

### Intelligence (rule-based)
8. Observations generated from metrics/events with confidence scores
9. Alerts generated from events with deduplication
10. Critical incidents auto-create war rooms
11. Commands suggested (not executed) from observations/alerts/war rooms

### Memory
12. Deployments, incidents, and milestones auto-create memory entries
13. Memory timeline visible on dashboard

### Safety
14. Zero writes to non-`nexus_*` tables from Nexus code paths
15. Zero AI/LLM API calls
16. Zero automation execution (approve does not trigger external actions)
17. `recommend.rollback` stored as suggestion only
18. All owner write actions logged in `nexus_activity_log`

### Stability
19. All existing `/admin/*` staff routes work identically after route group refactor
20. Existing crons (`shop-expire-reservations`, `push-dispatch`) unaffected
21. App boots with no Nexus env vars configured (Nexus degraded, core app works)
22. Phase 7 migrations and commerce flows untouched

### UI
23. Dashboard shows all panels per Revision B layout
24. War Room panel appears only during active war room
25. Mobile-first layout functional on phone viewport
26. AI Status Panel shows "Mark II" for reasoning (no fake AI)

---

## Implementation Sequence Summary

```
Phase 0   → Admin route isolation (MUST be first)
Phase 1   → 7 database migrations (sequential)
Phase 2   → Core lib (auth, types)
Phase 3   → Event ingestion
Phase 4   → System health engine
Phase 5   → Mission health engine
Phase 6   → Metrics engine
Phase 7   → Alert engine
Phase 8   → Observation engine
Phase 9   → War room manager
Phase 10  → Command system (suggestions only)
Phase 11  → Memory engine
Phase 12  → AI stubs
Phase 13  → Cron routes + vercel.json
Phase 14  → Webhook routes
Phase 15  → Owner API routes (30 endpoints)
Phase 16  → UI shell + shared components
Phase 17  → Dashboard panels
Phase 18  → Pages
Phase 19  → Hardening + acceptance
```

**Parallelization opportunity:** Phases 4 and 5 can be built in parallel after Phase 3. Phases 8–11 can be built in parallel after Phase 7. Phase 15 API routes can start as soon as their engine phase completes. UI (Phases 16–18) should wait until Phase 15 dashboard endpoint is ready.

**Estimated file count:** ~130 new files, 9 modified files, 7 migrations.

---

*End of Implementation Plan. Ready for Codex execution starting at Phase 0.*
