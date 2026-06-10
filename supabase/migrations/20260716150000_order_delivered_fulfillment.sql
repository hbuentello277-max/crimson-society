-- Add delivered fulfillment status and timestamp for shipping orders.

alter table public.shop_orders
  add column if not exists delivered_at timestamptz;

alter table public.shop_orders drop constraint if exists shop_orders_fulfillment_status_check;

alter table public.shop_orders add constraint shop_orders_fulfillment_status_check
  check (fulfillment_status in ('unfulfilled', 'fulfilled', 'shipped', 'delivered', 'cancelled'));

create index if not exists shop_orders_delivered_idx
  on public.shop_orders (delivered_at desc)
  where fulfillment_status = 'delivered';

notify pgrst, 'reload schema';
