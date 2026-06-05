-- Phase 6E: local pickup delivery option for merch orders

alter table public.shop_orders
  add column if not exists delivery_method text not null default 'shipping'
    check (delivery_method in ('shipping', 'local_pickup')),
  add column if not exists pickup_status text not null default 'not_applicable'
    check (pickup_status in ('not_applicable', 'pending', 'ready', 'picked_up', 'cancelled')),
  add column if not exists pickup_note text,
  add column if not exists pickup_ready_at timestamptz,
  add column if not exists picked_up_at timestamptz;

comment on column public.shop_orders.delivery_method is 'shipping or local_pickup';
comment on column public.shop_orders.pickup_status is 'Pickup workflow; not_applicable for shipped orders';

create index if not exists shop_orders_delivery_pickup_idx
  on public.shop_orders (delivery_method, pickup_status)
  where delivery_method = 'local_pickup';
