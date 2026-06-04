-- Phase 6D: fulfillment fields separate from payment status on shop_orders.

alter table public.shop_orders
  add column if not exists fulfillment_status text not null default 'unfulfilled',
  add column if not exists fulfilled_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists tracking_number text,
  add column if not exists tracking_carrier text,
  add column if not exists tracking_url text,
  add column if not exists admin_fulfillment_note text,
  add column if not exists customer_note text;

alter table public.shop_orders drop constraint if exists shop_orders_fulfillment_status_check;
alter table public.shop_orders add constraint shop_orders_fulfillment_status_check
  check (fulfillment_status in ('unfulfilled', 'fulfilled', 'shipped', 'cancelled'));

create index if not exists shop_orders_fulfillment_status_idx
  on public.shop_orders (fulfillment_status, created_at desc);

-- Paid orders awaiting fulfillment (admin queue).
create index if not exists shop_orders_paid_unfulfilled_idx
  on public.shop_orders (created_at desc)
  where status = 'paid' and fulfillment_status = 'unfulfilled';

update public.shop_orders
set fulfillment_status = 'fulfilled'
where status = 'fulfilled'
  and fulfillment_status = 'unfulfilled';

update public.shop_orders
set status = 'paid'
where status = 'fulfilled';
