-- Archive test/mock shop orders (admin cleanup).

alter table public.shop_orders
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.profiles (id) on delete set null;

comment on column public.shop_orders.archived_at is 'When set, order is hidden from customer order history.';
comment on column public.shop_orders.archived_by is 'Admin who archived the order.';

create index if not exists shop_orders_archived_at_idx
  on public.shop_orders (archived_at desc nulls last);

create index if not exists shop_orders_active_created_idx
  on public.shop_orders (created_at desc)
  where archived_at is null;
