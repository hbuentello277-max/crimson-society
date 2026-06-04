-- Phase 6A: Merch orders foundation (no Stripe checkout yet).

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (
    status in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')
  ),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  shipping_name text,
  shipping_email text,
  shipping_phone text,
  shipping_address jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_orders_user_id_created_idx
  on public.shop_orders (user_id, created_at desc);

create index if not exists shop_orders_status_created_idx
  on public.shop_orders (status, created_at desc);

create unique index if not exists shop_orders_stripe_checkout_session_id_key
  on public.shop_orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create table if not exists public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  product_image_url text,
  size text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  reservation_id uuid references public.product_inventory_reservations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists shop_order_items_order_id_idx
  on public.shop_order_items (order_id);

create index if not exists shop_order_items_product_id_idx
  on public.shop_order_items (product_id);

drop trigger if exists touch_shop_orders_updated_at on public.shop_orders;
create trigger touch_shop_orders_updated_at
before update on public.shop_orders
for each row execute function public.touch_updated_at();

alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

-- Users read their own orders.
drop policy if exists "Users read own shop orders" on public.shop_orders;
create policy "Users read own shop orders"
on public.shop_orders
for select
to authenticated
using (user_id = auth.uid());

-- Admins read all orders.
drop policy if exists "Admins read all shop orders" on public.shop_orders;
create policy "Admins read all shop orders"
on public.shop_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and (p.role = 'admin' or p.is_admin = true)
  )
);

-- Order items: readable when parent order is readable.
drop policy if exists "Users read own shop order items" on public.shop_order_items;
create policy "Users read own shop order items"
on public.shop_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.shop_orders o
    where o.id = order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Admins read all shop order items" on public.shop_order_items;
create policy "Admins read all shop order items"
on public.shop_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and (p.role = 'admin' or p.is_admin = true)
  )
);

revoke insert, update, delete on public.shop_orders from authenticated, anon;
revoke insert, update, delete on public.shop_order_items from authenticated, anon;
grant select on public.shop_orders to authenticated;
grant select on public.shop_order_items to authenticated;
