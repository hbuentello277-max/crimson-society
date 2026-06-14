<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Architecture
Single Next.js 16 app (App Router) using React 19, Tailwind v4, Framer Motion, Zustand, Supabase (auth/DB/realtime/storage), Stripe (payments), and Leaflet (maps).

### Running the dev server
```bash
npm run dev   # starts on http://localhost:3000
```

### Lint / Build / Test
- **Lint:** `npx eslint .` (flat config at `eslint.config.mjs`)
- **Build:** `npm run build` (uses Turbopack)
- No automated test suite exists in this repo.

### Environment variables
A `.env.local` file is required. Key variables:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_APEX_MONTHLY_PRICE_ID`, `STRIPE_APEX_YEARLY_PRICE_ID`
- `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)

The app gracefully falls back to placeholders for client-side Supabase when env vars are missing, so the UI renders without a live Supabase instance. Server-side routes (webhooks, checkout) will fail without real credentials.

### Supabase (local development)
If a local Supabase instance is needed, use `npx supabase start` (requires Docker). Migrations are in `supabase/migrations/`. The `supabase/config.toml` defines a `stripe-webhook` edge function with JWT verification disabled.

### Gotchas
- The browser client (`lib/supabase.ts`) only throws on missing env vars when running in the browser (`typeof window !== "undefined"`). During SSR/build it silently uses placeholder values.
- `eslint-config-next` uses the new flat config format (`defineConfig` from `eslint/config`).
