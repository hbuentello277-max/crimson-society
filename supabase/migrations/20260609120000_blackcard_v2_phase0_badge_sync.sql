-- Blackcard V2 Phase 0: public badge denormalization + webhook idempotency

alter table public.profiles
  add column if not exists blackcard_public boolean not null default false;

create index if not exists profiles_blackcard_public_idx
  on public.profiles (blackcard_public)
  where blackcard_public = true;

-- Backfill from active subscriptions
update public.profiles p
set blackcard_public = true
where exists (
  select 1
  from public.subscriptions s
  where s.user_id = p.id
    and s.status in ('active', 'trialing')
    and (s.current_period_end is null or s.current_period_end >= now())
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at desc);

alter table public.stripe_webhook_events enable row level security;
