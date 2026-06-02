# Email verification (Supabase Auth)

## App behavior

1. **Signup** (`app/signup/page.tsx`) — `signUp` with `emailRedirectTo: {origin}/auth/callback`.
2. **Email link** — Supabase sends confirmation; user opens link with `?code=`.
3. **Callback** (`app/auth/callback/route.ts`) — exchanges code for session cookies, then:
   - **Incomplete profile** (missing `username` or `display_name`) → `/profile/setup`
   - **Complete profile** → `/dashboard`
   - Optional safe `?next=/path` only applies when profile is complete.
4. **Password login** (`app/login/page.tsx`) — same routing via `redirectAfterAuth`.

## Supabase Dashboard (required)

**Authentication → URL configuration**

| Setting | Value |
|---------|--------|
| **Site URL** | Production origin, e.g. `https://your-domain.com` |
| **Redirect URLs** | `https://your-domain.com/auth/callback` |
| | `http://localhost:3000/auth/callback` (local) |

**Authentication → Providers → Email**

- Enable **Confirm email** for production (recommended).
- Customize confirmation email template if needed; link must use Supabase’s `{{ .ConfirmationURL }}` (includes redirect to your allowlisted callback).

## Local testing

1. Add `http://localhost:3000/auth/callback` to Redirect URLs.
2. Sign up → open confirmation email → land on callback → setup or dashboard.
3. Unconfirmed login shows resend on `/login`.

## Files

- `app/auth/callback/route.ts`
- `app/signup/page.tsx`
- `app/login/page.tsx`
- `lib/auth/post-auth-redirect.ts`
- `lib/auth/redirect-after-auth.ts`
- `lib/profile.ts` (`isProfileSetupComplete`)
