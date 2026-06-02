# Crimson Society — Launch Readiness Audit

**Audit date:** June 2, 2026  
**Branch:** `main` (pre-audit HEAD: `5ce43b8`)  
**Scope:** Full-app review for App Store / production launch (report only; no fixes applied)  
**Validation:** `npx tsc --noEmit` ✅ · `npm run build` ✅  

---

## Launch readiness score: **62 / 100**

| Band | Meaning |
|------|---------|
| 80–100 | Ready for public App Store launch with minor polish |
| 60–79 | Strong beta; launch blockers remain |
| 40–59 | Major gaps in safety, ops, or compliance |
| &lt;40 | Not safe to ship |

**Verdict:** Suitable for **closed beta** with ops discipline. **Not** ready for broad App Store launch until critical items below are resolved and pending Supabase migrations are applied to production.

---

## 1. Launch-ready

| Area | Notes |
|------|--------|
| **Authentication** | Email/password signup & login, email confirmation flow, `/auth/callback`, profile bootstrap via `ensureUserProfile`, role/status on session (`AuthProvider`). |
| **Profile setup** | Multi-step `/profile/setup` (rider, bike, style). |
| **Own profile** | `/profile` with posts, stats, settings links, Blackcard badge, account deletion *request*. |
| **Public profiles** | `/profile/[username]` with posts, garage, hosted meets, follow/unfollow, block, report. |
| **Followers / following lists** | `/profile/followers`, `/profile/following`, `/profile/[username]/followers`, `/profile/[username]/following` via `FollowListView`. |
| **Blocking (client)** | Block/unblock on public profile; `lib/blocking.ts` helpers; meet join blocked when host blocked (after migration). |
| **Reporting (user)** | Profile & meet report modals → `user_reports`. |
| **Messages** | DM inbox (`MessagesPanel`), realtime badges, block checks in discovery paths. |
| **Notifications** | Eight types in `lib/notifications.ts`; `NotificationsPanel`; deep links to profile/meet. |
| **Inbox UX** | `InboxSwipeTabs` (swipe + tab bar, unread badges, URL `?tab=notifications`). |
| **Meets** | Create/join/leave, chat, media, route snapping, read receipts, meet reports. |
| **Meet host controls** | `RideDetailsModal`: View/Hide Riders, Remove Rider, Cancel Meet, End Ride (when tracking active); `cancelMeet` on rides page. |
| **Live map** | Dashboard preview of active riders; `/rides/track` lifecycle (start/share/end). |
| **Blackcard / Stripe** | Checkout session API, webhook → subscription + profile premium fields; `/blackcard`, admin pricing. |
| **Legal pages** | `/privacy`, `/terms`, `/safety`, `/community-guidelines` (June 2026 copy). |
| **Admin (partial)** | Gated layout; profile role/status/membership; Blackcard, shop, sounds admin; secure `/api/admin/profiles/membership`. |
| **PWA metadata** | `app/manifest.ts`, icons (`public/icon-192.png`, `icon-512.png`), `appleWebApp` in layout. |
| **Build health** | TypeScript clean; Next.js production build succeeds (40 routes). |

---

## 2. Partially complete

| Area | Gap |
|------|-----|
| **Admin moderation** | Dashboard shows reports & deletion queue **read-only**; PATCH APIs exist (`/api/admin/reports`, `/api/admin/deletion-requests`) but UI does not call them. |
| **Admin profile list** | Loads via client `supabase.from("profiles")` — subject to RLS; `/api/admin/profiles` exists but is unused in UI. |
| **Account deletion** | User can submit request only; no automated auth/user purge; copy describes beta manual review. |
| **Privacy settings** | DB columns `hide_from_suggestions`, `hide_location_from_suggestions` exist; **no user-facing toggles** in edit profile. |
| **Public profile social** | Follower/following **counts** on others’ profiles are not linked to list pages (own profile links work). |
| **Blocking enforcement** | App logic + migrations in repo; **production DB may lag** (see migrations). |
| **Meet “Invite” privacy** | `Open` \| `Invite` only — no host approval / lock-meet workflow. |
| **PWA** | Manifest + icons only; **no service worker**, offline shell, or install prompt. |
| **Redirects** | `/messages`, `/notifications` → inbox; legacy paths still in nav history. |
| **Error / empty states** | Present on major surfaces; some flows use `alert()` or generic console errors. |
| **Password policy** | Minimum 6 characters on signup — below typical App Store / security expectations. |

---

## 3. Missing

| Item | Impact |
|------|--------|
| **Age verification / minimum age gate** | App Store Guideline 1.2 (UGC), COPPA-adjacent risk for social product. |
| **Support / contact channel in-app** | Policies lack actionable support email; review often asks for contact + moderation path. |
| **Documented moderation SLA & in-app “report outcome”** | Users can report; no status feedback. |
| **Automated account deletion pipeline** | GDPR/CCPA-style expectations for “delete my account”. |
| **Service worker + install UX** | “Add to Home Screen” not guided; limited offline behavior. |
| **Meet reminders / scheduled notifications** | No cron/edge jobs for upcoming meets. |
| **Invite-only meet enforcement** | `Invite` privacy not clearly enforced in join RLS/UI. |
| **Remove empty `app/api/admin/membership/` directory** | Stale artifact (route removed from build); cleanup for clarity. |

---

## 4. App Store review risks

1. **User-generated content** without demonstrated **timely moderation** (read-only admin queue).
2. **No age attestation** on signup for a social/messaging/rides product.
3. **Account deletion** request-only; policies promise review but no in-app completion path.
4. **Live location** — must ensure App Privacy labels and permission strings match behavior (browser geolocation + ride context).
5. **Debug / diagnostic surfaces** shipped in production build (`/api/debug/profile-save`, “Profile Save Debug” on edit profile).
6. **Physical safety disclaimers** exist on `/safety` and `/terms` — good; ensure they are linked at signup (currently policy links mainly on profile edit).

---

## 5. Likely user complaints

- Reports “go nowhere” from the user’s perspective (no acknowledgment beyond toast).
- Deletion requests feel stuck in “beta”.
- Cannot control discovery privacy (hide from suggestions / hide region) despite policy mentions.
- Follower counts on other profiles don’t open lists.
- Joining a meet after host canceled if DB migration not applied (stale `active` meets).
- Notification gaps if production DB missing new `notifications.type` values (migration `20260602160000`).
- PWA users expecting native-like install — only browser manual add.
- Weak password rules + no MFA.

---

## 6. Security concerns

| Severity | Issue |
|----------|--------|
| **High** | `/api/debug/profile-save` exposed in production — authenticated profile mutation probe. |
| **High** | Three Supabase migrations **in repo, not verified applied** to project `clelrausyoejbpqlxplf` — blocking, host moderation, notification constraint. |
| **Medium** | Admin moderation data fetched client-side; relies on RLS + `is_profile_admin` — correct if RLS is current, fragile if migrations lag. |
| **Medium** | Service role used in Stripe webhook & secured admin routes — ensure secrets rotation and no logging of keys. |
| **Low** | `Profile Save Debug` panel visible to end users on `/profile/edit` on error. |
| **Resolved** | Unauthenticated `/api/admin/membership` **removed** from build output (empty directory remains). |

---

## 7. Privacy concerns

- Live location stored in `ride_live_locations` — policies describe scope; needs **in-app controls** aligned with `hide_location_from_suggestions`.
- Public profile exposes posts, garage, meets — consistent with terms but users cannot limit discovery without DB-only flags.
- Messages stored and described as reviewable for safety — standard for UGC apps; needs operational access policy.
- No explicit “download my data” flow.

---

## 8. Moderation concerns

- Reports insert works; **no admin UI actions** (resolve/dismiss/suspend from queue).
- Deletion requests visible; **no complete/reject** buttons despite PATCH API.
- Host can remove riders / cancel meets (app + migration) — good for meet-level moderation.
- No content moderation queue for posts/meet chat beyond admin “Recent Posts” read-only list.
- No automated triage, SLA, or escalation contacts in Safety page.

---

## Prioritized backlog

### CRITICAL

| # | Item | Why | Affected files / areas | Effort |
|---|------|-----|------------------------|--------|
| C1 | **Apply pending Supabase migrations to production** | Blocking, meet host RLS, notification types break silently if DB lags. | `supabase/migrations/20260602140000_harden_blocking_safety.sql`, `20260602150000_meet_host_moderation.sql`, `20260602160000_fix_notifications_type_check.sql` | **S** (ops; `supabase db push` + verify) |
| C2 | **Remove or gate debug endpoints & debug UI** | Data integrity risk; unprofessional in review. | `app/api/debug/profile-save/route.ts`, `app/profile/edit/page.tsx` (Profile Save Debug) | **S** |
| C3 | **Wire admin moderation actions to secure APIs** | App Store expects actionable UGC moderation. | `app/admin/page.tsx`, `app/api/admin/reports/route.ts`, `app/api/admin/deletion-requests/route.ts`, `lib/admin-api.ts` | **M** (1–2 days) |
| C4 | **Account deletion completion path** | Legal / App Store account deletion expectations. | `app/api/admin/deletion-requests`, Supabase Auth admin, `app/profile/page.tsx`, ops runbook | **L** (3–5 days) |
| C5 | **Age gate + signup attestation** | Social/UGC/messaging apps routinely rejected without it. | `app/signup/page.tsx`, `app/terms/page.tsx`, optional DB flag | **M** |

### HIGH

| # | Item | Why | Affected files / areas | Effort |
|---|------|-----|------------------------|--------|
| H1 | **Privacy toggles in profile settings** | Policies promise controls users cannot access. | `components/profile/EditProfileForm.tsx`, `lib/profile.ts` | **M** |
| H2 | **Support contact in policies + Safety** | Review contact requirement. | `app/privacy/page.tsx`, `app/safety/page.tsx`, `components/policies/PolicyPage.tsx` | **S** |
| H3 | **Link public profile follower/following counts** | Expected social UX; reduces confusion. | `app/profile/[username]/page.tsx` | **S** |
| H4 | **Report status feedback for reporters** | Trust & safety perception. | `user_reports` read path, notifications optional | **M** |
| H5 | **Strengthen password policy** | Security & review checklist. | `app/signup/page.tsx`, Supabase Auth settings | **S** |
| H6 | **Verify RLS on admin-only tables** | Client-side admin fetches depend on it. | Supabase policies, `app/admin/page.tsx` | **S** (audit) |

### MEDIUM

| # | Item | Why | Affected files / areas | Effort |
|---|------|-----|------------------------|--------|
| M1 | **PWA service worker + install prompt** | Install flow audit item incomplete. | `app/layout.tsx`, new `public/sw.js` or next-pwa | **M** |
| M2 | **Use `/api/admin/profiles` for Control Room list** | Avoid RLS-limited partial admin view. | `app/admin/page.tsx`, `app/api/admin/profiles/route.ts` | **S** |
| M3 | **Invite-only meet enforcement** | Privacy setting credibility. | `app/rides/page.tsx`, RLS on `ride_attendees` | **M** |
| M4 | **Meet reminders** | Engagement & safety (optional). | Edge function / cron, `notifications` types | **L** |
| M5 | **Remove stale `app/api/admin/membership/` directory** | Confusion during security review. | filesystem cleanup | **XS** |
| M6 | **Signup links to Terms / Guidelines** | Compliance visibility at account creation. | `app/signup/page.tsx` | **S** |

### LOW

| # | Item | Why | Affected files / areas | Effort |
|---|------|-----|------------------------|--------|
| L1 | **Replace `alert()` on create flow** | Polish. | `app/create/page.tsx` | **S** |
| L2 | **Consolidate `/messages` / `/notifications` redirects** | Reduce duplicate routes in analytics. | `app/messages/page.tsx`, `app/notifications/page.tsx` | **XS** |
| L3 | **Data export request** | Privacy best practice. | New API + settings link | **L** |
| L4 | **MFA / passkeys** | Hardening post-launch. | Supabase Auth config | **L** |

*Effort key: **XS** &lt;2h · **S** half day · **M** 1–2 days · **L** 3+ days*

---

## Recommended next sprint

1. **Ops:** Apply migrations C1; smoke-test follow/block/meet host/notifications on staging production parity.  
2. **Security:** C2 debug removal.  
3. **Trust & safety:** C3 admin queue actions + H2 support contact.  
4. **Compliance:** C5 age gate + H1 privacy toggles + M6 signup policy links.  
5. **Polish:** H3 follower links + H5 passwords.

---

## Files reviewed (representative)

**App routes:** `app/login`, `signup`, `auth/callback`, `dashboard`, `connect`, `create`, `inbox`, `messages/*`, `notifications`, `profile/*`, `rides`, `rides/track`, `blackcard`, `checkout/*`, `admin/*`, `privacy`, `terms`, `safety`, `community-guidelines`, `manifest.ts`, `layout.tsx`

**Components:** `AuthProvider`, `BottomNav`, `inbox/*`, `profile/*`, `rides/*`, `RideMap`, `blackcard/*`, `policies/PolicyPage`

**API:** `app/api/admin/*`, `app/api/stripe/*`, `app/api/debug/profile-save`

**Lib:** `profile.ts`, `blocking.ts`, `notifications.ts`, `admin-api.ts`, `membership.ts`, `stripe.ts`, `requireCompleteProfile.ts`, rides/gps helpers

**Database:** `supabase/migrations/*` (through `20260602160000_fix_notifications_type_check.sql`)

---

## Validation log

```
npx tsc --noEmit   # exit 0
npm run build      # exit 0, Next.js 16.2.6, 40 routes
```

---

*This document is audit-only. No product code was changed as part of this commit.*
