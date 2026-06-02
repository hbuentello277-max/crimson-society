# Crimson Society — Launch Readiness Audit (Refresh)

**Audit date:** June 2, 2026 (refresh)  
**Branch:** `main`  
**Baseline:** Prior audit score **62 / 100** (`docs/LAUNCH_READINESS_AUDIT.md` @ `18d6cb3`)  
**HEAD at refresh:** `7fc271836b80369bd7af8fedac1c1fade9c0d439`  
**Scope:** Full-app review for App Store / production launch (audit only; no product fixes in this commit)  
**Validation:** `npx tsc --noEmit` ✅ · `npm run build` ✅ (Next.js 16.2.6, **41 routes**)

---

## Launch readiness score: **76 / 100** (+14 vs baseline)

| Band | Meaning |
|------|---------|
| 80–100 | Ready for public App Store launch with minor polish |
| 60–79 | Strong beta; launch blockers remain |
| 40–59 | Major gaps in safety, ops, or compliance |
| &lt;40 | Not safe to ship |

**Verdict:** **Closed / invite beta ready** with ops discipline. **Approaching** public App Store readiness; remaining gaps are mostly **production ops**, **policy packaging**, and **post-launch polish** — not missing core social/meet/messaging flows.

### Delta since baseline (sprints landed on `main`)

| Area | Baseline | Now |
|------|----------|-----|
| Privacy toggles | DB only | `/profile/edit` → `PrivacySettingsSection` (`hide_from_suggestions`, `hide_location_from_suggestions`, blocked list) |
| Support contact | Missing | `/support`, profile menu, legal pages via `SupportContactSection` |
| Signup compliance | Missing | Age 18+, Terms, Guidelines checkboxes + links on `/signup` |
| Public follower links | Counts not tappable | `/profile/[username]/followers` & `/following` |
| Admin moderation | Read-only UI | Report + deletion queue actions wired to secure PATCH APIs |
| Account deletion | Request-only | Admin **complete** → `applyDeletionCompletion` (profile blocked + auth ban) |
| Debug surfaces | Shipped | **Removed** (`/api/debug/profile-save`, edit-profile debug panel) |
| Host Controls | Duplicate block | **Single** block in `RideDetailsModal` |
| Messages inbox | Suggestions as threads | **Real conversations only** (`conversationHasMessages`); New Message modal separate |
| Stale API dir | `api/admin/membership/` | **Removed** from tree |

---

## 1. Launch-ready

| Area | Notes |
|------|--------|
| **Authentication** | Email/password signup & login, email confirmation, `/auth/callback`, `ensureUserProfile`, session role/status (`AuthProvider`). |
| **Signup compliance** | Required checkboxes: 18+, Terms (`/terms`), Community Guidelines (`/community-guidelines`); submit disabled until all checked. |
| **Profile setup** | Multi-step `/profile/setup`. |
| **Own profile** | `/profile` — posts, stats, settings, Blackcard, deletion request/cancel, **Support** menu link. |
| **Public profiles** | `/profile/[username]` — posts, garage, meets, follow/unfollow, block, report; **tappable** follower/following counts. |
| **Followers / following** | Own: `/profile/followers`, `/profile/following`. Public: `/profile/[username]/followers`, `/following` via `FollowListView`. |
| **Blocking** | Profile block/unblock; `lib/blocking.ts`; blocked list at `/profile/privacy/blocked`; meet join blocked when host blocked (migration-dependent). |
| **Reporting (user)** | Profile & meet reports → `user_reports`. |
| **Admin moderation** | Gated `/admin`; report status actions (reviewing / resolved / dismissed); deletion queue (reviewing / completed / canceled); secure APIs. |
| **Account deletion** | User request on private profile; admin completion disables access (`applyDeletionCompletion`). |
| **Messages** | Inbox `MessagesPanel`; **conversation list = threads with ≥1 message**; realtime; block checks; New Message modal for starting chats. |
| **Notifications** | Eight types in `lib/notifications.ts`; `NotificationsPanel`; deep links. |
| **Inbox UX** | `InboxSwipeTabs`; `/messages` & `/notifications` redirect to `/inbox`. |
| **Meets** | Create/join/leave, chat, media, routes, read receipts, meet reports. |
| **Meet host controls** | Single Host Controls: View/Hide Riders, Cancel Meet, End Ride, remove rider; `canModerate` gated. |
| **Live map** | Dashboard preview; `/rides/track` share lifecycle. |
| **Privacy (in-app)** | Discovery visibility + location-in-discovery toggles; live map linked from settings copy. |
| **Blackcard / Stripe** | Checkout + webhook; admin pricing. |
| **Support** | `/support` page; `lib/support.ts` (`NEXT_PUBLIC_SUPPORT_EMAIL` or fallback). |
| **Legal pages** | `/privacy`, `/terms`, `/safety`, `/community-guidelines` + **Support / Contact** section. |
| **PWA metadata** | `app/manifest.ts`, icons, `appleWebApp` in layout. |
| **Build health** | TypeScript clean; production build succeeds. |

---

## 2. Partially complete

| Area | Gap |
|------|-----|
| **Production database parity** | Repo migrations through `20260602160000`; **cannot verify** applied on live Supabase from codebase alone. |
| **Account deletion** | Access disable on complete; **no automated content/auth purge**; manual follow-up documented in API response. |
| **Reporter feedback** | Users can report; **no in-app status** when admin resolves/dismisses (unless added as notification type later). |
| **Invite-only meets** | `Open` \| `Invite` UI label; **join flow does not enforce** invite-only in `toggleJoin` / RLS (open join still possible). |
| **Password policy** | Minimum **6 characters** on signup — below typical App Store / security expectations. |
| **Support email in production** | Fallback `hbuentello277@gmail.com` unless `NEXT_PUBLIC_SUPPORT_EMAIL` set in deploy env. |
| **Admin profile Control Room** | Moderation uses client `supabase.from("profiles")` for lookups; `/api/admin/profiles` exists but full list not primary path. |
| **PWA** | Manifest + icons; **no service worker**, offline shell, or guided install. |
| **Live location disclosures** | Browser geolocation on map/track; App Privacy labels / store metadata must be completed **outside** repo. |
| **Data export** | No “download my data” self-serve flow. |

---

## 3. Missing (post-launch or non-code)

| Item | Impact |
|------|--------|
| **Service worker + install UX** | Limited “Add to Home Screen” guidance. |
| **Meet reminders / scheduled notifications** | No cron/edge jobs for upcoming meets. |
| **Automated full erasure pipeline** | GDPR-style full delete beyond ban + block. |
| **MFA / passkeys** | Account hardening. |
| **Report outcome notifications to reporters** | Trust & safety transparency. |
| **Invite-only meet enforcement (server + UI)** | Privacy setting credibility. |

---

## 4. App Store review risks (updated)

| Risk | Status |
|------|--------|
| UGC without moderation path | **Mitigated** — admin queue actions exist. |
| No age attestation | **Mitigated** — signup checkboxes (attestation, not ID verification). |
| No support contact | **Mitigated** — `/support` + legal sections. |
| Account deletion unclear | **Partially mitigated** — request + admin complete disables access; not full purge. |
| Live location / permissions | **Operational** — ensure store privacy questionnaire matches geolocation + ride sharing. |
| Debug endpoints in production | **Resolved** — removed. |
| Policies not linked at signup | **Resolved** — Terms + Guidelines linked from checkboxes. |
| Weak password rules | **Still open** — 6-char minimum. |
| Discovery privacy promises vs product | **Resolved** — toggles in edit profile. |

---

## 5. Likely user complaints (remaining)

- Deletion “completed” but posts/messages still visible in community history (by design; needs clear copy).
- Reports feel one-way (no reporter notification).
- Invite meets behave like open joins.
- PWA install not guided.
- Support email may look personal if env not set to `support@crimsonsociety.app`.
- Notification/type errors if production DB migrations lag.

---

## 6. Security concerns

| Severity | Issue |
|----------|--------|
| **High** | **Production migrations unverified** — blocking, host moderation, notification type constraint may be missing on live DB. |
| **Medium** | Admin moderation fetches reports/deletions client-side — depends on RLS + `is_profile_admin`. |
| **Medium** | Service role in Stripe webhook & admin APIs — secrets hygiene required. |
| **Low** | Password length 6 — credential stuffing risk. |
| **Resolved** | `/api/debug/profile-save` removed. |
| **Resolved** | End-user Profile Save Debug panel removed from edit profile. |

---

## 7. Privacy concerns

| Topic | Status |
|-------|--------|
| Discovery opt-out | **In-app toggles** on `/profile/edit`. |
| Location in discovery | **Toggle** + Connect respects `hide_location_from_suggestions`. |
| Live location | Ride-scoped; controlled on `/rides/track`; linked from privacy settings. |
| Messages reviewable | Described in Privacy Policy; operational policy needed. |
| Data export | Not implemented. |

---

## 8. Moderation concerns

| Topic | Status |
|-------|--------|
| Report intake | Working (`user_reports` insert). |
| Admin report actions | **Working** (reviewing / resolved / dismissed via API). |
| Deletion queue | **Working** (reviewing / completed / canceled; complete bans user). |
| Post/meet chat moderation | Read-only recent lists; no per-message delete UI. |
| SLA / escalation in Safety | Support email present; no published response SLA in app. |

---

## Remaining backlog

### CRITICAL (before broad App Store launch)

| # | Item | Why |
|---|------|-----|
| C1 | **Apply & verify Supabase migrations on production** | Blocking, meet host RLS, notification types fail silently if DB lags. |
| C2 | **App Store privacy labels + permission copy** | Must match geolocation, messaging, photos, live location behavior. |
| C3 | **Set production `NEXT_PUBLIC_SUPPORT_EMAIL`** | Review expects stable brand contact (e.g. `support@crimsonsociety.app`). |

### HIGH (strongly recommended pre-launch)

| # | Item | Why |
|---|------|-----|
| H1 | **Strengthen password policy** (8+ chars, complexity or Supabase Auth settings) | Security + review checklist. |
| H2 | **Reporter notification on report resolution** | UGC trust signal for App Review narrative. |
| H3 | **Invite-only meet enforcement** | UI promises `Invite` privacy. |
| H4 | **Deletion completion copy + optional email** | Set expectations when content retained. |
| H5 | **Staging smoke test matrix** | Auth, block, meet host, messages, notifications, Stripe, admin queue on prod-parity DB. |

### MEDIUM (can ship beta without)

| # | Item | Why |
|---|------|-----|
| M1 | **PWA service worker + install prompt** | Install audit item. |
| M2 | **Use `/api/admin/profiles` for Control Room** | Avoid RLS-limited admin profile reads. |
| M3 | **Meet reminders** | Engagement. |
| M4 | **Replace `alert()` on create flow** | Polish. |
| M5 | **Content purge runbook for completed deletions** | Legal ops. |

### LOW (after launch)

| # | Item |
|---|------|
| L1 | Data export request flow |
| L2 | MFA / passkeys |
| L3 | Automated triage / SLA dashboard |
| L4 | Per-message moderation tools |

---

## Required before App Store submission

1. **Production DB** — All migrations applied; smoke-test block, host remove/cancel, notifications insert, meet cancel.  
2. **Compliance package** — Privacy nutrition labels, age attestation description, support URL/email, Terms/Privacy URLs in App Store Connect.  
3. **Support** — Production env email + tested mailbox.  
4. **Password policy** — Align app + Supabase Auth with review expectations.  
5. **Moderation proof** — Admin account + documented workflow (reports + deletion queue already in app).  
6. **Live location** — Accurate “data collected” disclosure for ride tracking.  
7. **Test build** — Clean `tsc` + `build`; no debug routes in output.

---

## Can wait until after launch

- Service worker / offline PWA  
- Meet reminders  
- Reporter-facing report status UI  
- Invite-only enforcement (if beta only uses Open meets)  
- Full automated data erasure  
- MFA, data export, advanced admin content tools  
- Analytics consolidation for legacy redirects  

---

## Recommended next sprint

1. **Ops:** C1 migration verification + H5 smoke matrix on staging/production.  
2. **Compliance:** C2 App Store privacy questionnaire + C3 support email in Vercel/host env.  
3. **Trust:** H1 passwords + H2 report-resolved notification (optional type in `notifications`).  
4. **Product integrity:** H3 invite-only joins if `Invite` meets are marketed.  
5. **Polish:** M1 PWA install hint (lightweight) or defer post-launch.

---

## Area-by-area summary

| Area | Rating | Notes |
|------|--------|-------|
| Authentication | ✅ Ready | |
| Profiles | ✅ Ready | Privacy + blocked list added |
| Followers | ✅ Ready | Public + own links |
| Blocking | ✅ Ready | Migration-dependent on prod |
| Reports | ⚠️ Partial | Admin acts; no reporter feedback |
| Admin moderation | ✅ Ready | UI + APIs wired |
| Messages | ✅ Ready | Real threads only; New Message separate |
| Notifications | ⚠️ Partial | Code ready; DB type constraint on prod |
| Meets | ✅ Ready | Host controls deduped |
| Live map | ✅ Ready | Policy/disclosure external |
| Privacy | ✅ Ready | In-app toggles |
| Account deletion | ⚠️ Partial | Ban/block; not full purge |
| Support | ✅ Ready | Set prod email |
| Legal pages | ✅ Ready | Support section on all four |
| Signup compliance | ✅ Ready | |
| PWA | ⚠️ Partial | Metadata only |
| App Store requirements | ⚠️ Partial | Code ~ready; ops/legal packaging open |

---

## Files reviewed (representative)

**App routes:** `app/login`, `signup`, `auth/callback`, `dashboard`, `connect`, `create`, `inbox`, `messages/*`, `notifications`, `profile/*`, `rides`, `rides/track`, `blackcard`, `checkout/*`, `admin/*`, `privacy`, `terms`, `safety`, `community-guidelines`, `support`, `manifest.ts`, `layout.tsx`

**Components:** `AuthProvider`, `BottomNav`, `inbox/*`, `profile/*` (incl. `PrivacySettingsSection`), `rides/RideDetailsModal`, `RideMap`, `policies/*`, `blackcard/*`

**API:** `app/api/admin/reports`, `deletion-requests`, `profiles`, `profiles/membership`, `stripe/*` (no debug routes)

**Lib:** `profile.ts`, `blocking.ts`, `notifications.ts`, `admin-api.ts`, `account-deletion.ts`, `support.ts`, `membership.ts`

**Database:** `supabase/migrations/*` through `20260602160000_fix_notifications_type_check.sql`

---

## Validation log

```
npx tsc --noEmit   # exit 0
npm run build      # exit 0, Next.js 16.2.6, 41 routes
```

---

*Refresh audit only. Product behavior documented as of `7fc2718` on `main`.*
