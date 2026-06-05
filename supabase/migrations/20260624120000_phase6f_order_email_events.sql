-- Phase 6F: idempotent merch order transactional email log

create table if not exists public.shop_order_email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders (id) on delete cascade,
  email_type text not null
    check (email_type in ('order_confirmation', 'ready_for_pickup', 'shipped')),
  sent_to text not null,
  sent_at timestamptz not null default now(),
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  unique (order_id, email_type)
);

create index if not exists shop_order_email_events_order_id_idx
  on public.shop_order_email_events (order_id);

comment on table public.shop_order_email_events is
  'One row per order + email_type; prevents duplicate transactional merch emails.';

alter table public.shop_order_email_events enable row level security;
