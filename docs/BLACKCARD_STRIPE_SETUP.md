# Blackcard Stripe Setup (Phase 0)

Complete this checklist before accepting live Blackcard subscriptions.

---

## 1. Stripe Dashboard — Products & Prices

Create **one product** with **two recurring prices** (or two products — the app only references Price IDs).

### Product

| Field | Recommended value |
|-------|-------------------|
| **Name** | Blackcard Access |
| **Description** | Premium membership for Crimson Society — inner circle access, member badge, and upcoming perks. |
| **Tax behavior** | Configure per your jurisdiction |

### Monthly price

| Field | Recommended value |
|-------|-------------------|
| **Pricing model** | Standard, recurring |
| **Amount** | **$10.00 USD** / month |
| **Billing period** | Monthly |
| **Price ID** | Copy `price_...` after creation |

### Yearly price

| Field | Recommended value |
|-------|-------------------|
| **Pricing model** | Standard, recurring |
| **Amount** | **$79.00–$99.00 USD** / year (recommended: **$79.00** ≈ 34% off vs $120/yr at $10/mo) |
| **Billing period** | Yearly |
| **Price ID** | Copy `price_...` after creation |

### Exact products to create (copy-paste checklist)

```
Product 1: Blackcard Access
  └── Price A: $10.00 / month   → price_________________
  └── Price B: $79.00 / year    → price_________________
```

---

## 2. Link Prices to the App

Choose **one or both** methods:

### Option A — Admin UI (recommended)

1. Sign in as admin → `/admin/blackcard`
2. Paste each **Stripe Price ID** into the **Stripe Price ID** field for Monthly and Yearly
3. Save Pricing

### Option B — Database

```sql
UPDATE public.membership_plans
SET stripe_price_id = 'price_YOUR_MONTHLY_ID'
WHERE plan_type = 'monthly';

UPDATE public.membership_plans
SET stripe_price_id = 'price_YOUR_YEARLY_ID'
WHERE plan_type = 'yearly';

-- Align display prices with Stripe (cosmetic in app UI)
UPDATE public.membership_plans SET price = 10 WHERE plan_type = 'monthly';
UPDATE public.membership_plans SET price = 79 WHERE plan_type = 'yearly';
```

### Option C — Environment fallbacks

Set in Vercel if DB `stripe_price_id` is null:

```
STRIPE_APEX_MONTHLY_PRICE_ID=price_...
STRIPE_APEX_YEARLY_PRICE_ID=price_...
```

---

## 3. Webhook Endpoint

| Setting | Value |
|---------|-------|
| **URL** | `https://<your-production-domain>/api/stripe/webhook` |
| **Events** | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` |

Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET` in Vercel.

### Verify webhook

1. Stripe Dashboard → Developers → Webhooks → your endpoint
2. Send test event `customer.subscription.updated`
3. Confirm **200** response
4. Check Supabase `stripe_webhook_events` for the event ID (idempotency)
5. Confirm `subscriptions` row upserted and `profiles.blackcard_public = true` for test user

---

## 4. Billing Portal

1. Stripe Dashboard → **Settings → Billing → Customer portal**
2. Enable:
   - Cancel subscriptions
   - Update payment methods
   - View invoice history
3. Set return URL to `https://<your-production-domain>/blackcard` (app also sets this per session)

Members open the portal via **Manage Subscription** on `/blackcard`.

---

## 5. Environment Variables (Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Yes | Server Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signature verification |
| `STRIPE_APEX_MONTHLY_PRICE_ID` | Fallback | If DB price ID unset |
| `STRIPE_APEX_YEARLY_PRICE_ID` | Fallback | If DB price ID unset |
| `NEXT_PUBLIC_APP_URL` | Yes | Checkout + portal return URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Webhook admin client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Webhook writes + badge sync |

---

## 6. Database Migration

Apply Phase 0 migration before production:

```bash
# Via Supabase CLI or dashboard SQL runner
supabase/migrations/20260609120000_blackcard_v2_phase0_badge_sync.sql
```

This adds:
- `profiles.blackcard_public` (public member badge)
- `stripe_webhook_events` (webhook idempotency)
- Backfill of `blackcard_public` from existing active subscriptions

---

## 7. Smoke Test (Test Mode)

1. Set Stripe to **Test mode**; use test keys in preview deploy
2. Sign in as user with `profiles.status = 'active'`
3. Visit `/blackcard` → start **Monthly** checkout
4. Pay with test card `4242 4242 4242 4242`
5. Confirm `/checkout/success` shows active membership
6. Confirm `/blackcard` shows member view + **Manage Subscription**
7. Confirm **own profile** shows Blackcard Member badge
8. Confirm **public profile** (`/profile/<username>`) shows badge to another logged-in user
9. Open Billing Portal → cancel subscription
10. Confirm webhook sets `blackcard_public = false` and badge disappears
11. Attempt second checkout while active → **409 already_subscribed**

---

## 8. Go-Live

1. Switch Stripe to **Live mode**
2. Create live Product + Prices (same structure as test)
3. Update `stripe_price_id` in DB or env with **live** price IDs
4. Create live webhook endpoint with live signing secret
5. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to live values
6. Run one real subscription smoke test, then refund/cancel

---

## Phase 0 Scope (what this enables)

- Stripe checkout with price ID support (DB + env + admin UI)
- Billing Portal for self-service cancel/update
- Public Blackcard badge via `profiles.blackcard_public`
- Duplicate subscription prevention at checkout
- Webhook idempotency + badge sync on subscription events

**Not included in Phase 0:** Crimson Credits, referral codes, meet rewards, renewal credits, merch discounts.
