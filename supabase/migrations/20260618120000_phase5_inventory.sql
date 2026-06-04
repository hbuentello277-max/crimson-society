-- Phase 5: per-size inventory, reservations, and product/reward sync.

alter table public.products
  add column if not exists size_inventory jsonb;

create table if not exists public.product_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  size_label text,
  quantity integer not null default 1 check (quantity > 0),
  reservation_type text not null check (
    reservation_type in ('merch_checkout', 'credit_redemption')
  ),
  redemption_id uuid references public.crimson_credit_redemptions(id) on delete set null,
  status text not null default 'active' check (
    status in ('active', 'completed', 'released', 'expired')
  ),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_inventory_reservations_product_active_idx
  on public.product_inventory_reservations (product_id, status)
  where status = 'active';

create or replace function public.product_inventory_recompute_totals(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_map jsonb;
  v_totals record;
begin
  select size_inventory into v_map from public.products where id = p_product_id;
  if v_map is null or v_map = '{}'::jsonb then
    return;
  end if;

  select
    coalesce(sum((value->>'total')::int), 0) as total,
    coalesce(sum((value->>'available')::int), 0) as available,
    coalesce(sum((value->>'reserved')::int), 0) as reserved,
    coalesce(sum((value->>'sold')::int), 0) as sold
  into v_totals
  from jsonb_each(v_map);

  update public.products
  set
    inventory_total = v_totals.total,
    inventory_remaining = v_totals.available,
    status = case
      when v_totals.available <= 0 then 'out_of_stock'
      when status = 'out_of_stock' and v_totals.available > 0 then 'in_stock'
      else status
    end,
    updated_at = now()
  where id = p_product_id;
end;
$$;

create or replace function public.product_inventory_apply_map(
  p_product_id uuid,
  p_size_inventory jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set size_inventory = p_size_inventory,
      updated_at = now()
  where id = p_product_id;

  perform public.product_inventory_recompute_totals(p_product_id);
end;
$$;

create or replace function public.product_inventory_reserve(
  p_product_id uuid,
  p_size_label text,
  p_quantity integer default 1,
  p_reservation_type text default 'merch_checkout',
  p_user_id uuid default auth.uid(),
  p_redemption_id uuid default null,
  p_expires_minutes integer default 15
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_map jsonb;
  v_slot jsonb;
  v_key text;
  v_available int;
  v_reservation_id uuid;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  select size_inventory into v_map
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if v_map is null then
    return null;
  end if;

  v_key := coalesce(nullif(btrim(p_size_label), ''), '_all');

  v_slot := v_map -> v_key;
  if v_slot is null then
    raise exception 'Size not available for this product';
  end if;

  v_available := (v_slot->>'available')::int;
  if v_available < p_quantity then
    raise exception 'Insufficient inventory';
  end if;

  v_slot := jsonb_set(
    jsonb_set(
      jsonb_set(v_slot, '{available}', to_jsonb(v_available - p_quantity)),
      '{reserved}',
      to_jsonb(coalesce((v_slot->>'reserved')::int, 0) + p_quantity)
    ),
    '{total}',
    to_jsonb(coalesce((v_slot->>'total')::int, 0))
  );

  v_map := jsonb_set(v_map, array[v_key], v_slot);

  update public.products
  set size_inventory = v_map,
      updated_at = now()
  where id = p_product_id;

  insert into public.product_inventory_reservations (
    product_id,
    user_id,
    size_label,
    quantity,
    reservation_type,
    redemption_id,
    status,
    expires_at
  )
  values (
    p_product_id,
    p_user_id,
    nullif(v_key, '_all'),
    p_quantity,
    p_reservation_type,
    p_redemption_id,
    'active',
    case
      when p_reservation_type = 'merch_checkout'
        then now() + make_interval(mins => greatest(p_expires_minutes, 1))
      else null
    end
  )
  returning id into v_reservation_id;

  perform public.product_inventory_recompute_totals(p_product_id);

  return v_reservation_id;
end;
$$;

create or replace function public.product_inventory_release_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.product_inventory_reservations%rowtype;
  v_map jsonb;
  v_slot jsonb;
  v_key text;
begin
  select * into v_row
  from public.product_inventory_reservations
  where id = p_reservation_id
  for update;

  if not found or v_row.status <> 'active' then
    return;
  end if;

  select size_inventory into v_map
  from public.products
  where id = v_row.product_id
  for update;

  if v_map is not null then
    v_key := coalesce(nullif(btrim(v_row.size_label), ''), '_all');
    v_slot := v_map -> v_key;

    if v_slot is not null then
      v_slot := jsonb_set(
        jsonb_set(
          v_slot,
          '{available}',
          to_jsonb(coalesce((v_slot->>'available')::int, 0) + v_row.quantity)
        ),
        '{reserved}',
        to_jsonb(greatest(0, coalesce((v_slot->>'reserved')::int, 0) - v_row.quantity))
      );
      v_map := jsonb_set(v_map, array[v_key], v_slot);

      update public.products
      set size_inventory = v_map,
          updated_at = now()
      where id = v_row.product_id;
    end if;
  end if;

  update public.product_inventory_reservations
  set status = 'released', updated_at = now()
  where id = p_reservation_id;

  perform public.product_inventory_recompute_totals(v_row.product_id);
end;
$$;

create or replace function public.product_inventory_complete_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.product_inventory_reservations%rowtype;
  v_map jsonb;
  v_slot jsonb;
  v_key text;
begin
  select * into v_row
  from public.product_inventory_reservations
  where id = p_reservation_id
  for update;

  if not found or v_row.status <> 'active' then
    return;
  end if;

  select size_inventory into v_map
  from public.products
  where id = v_row.product_id
  for update;

  if v_map is not null then
    v_key := coalesce(nullif(btrim(v_row.size_label), ''), '_all');
    v_slot := v_map -> v_key;

    if v_slot is not null then
      v_slot := jsonb_set(
        jsonb_set(
          v_slot,
          '{reserved}',
          to_jsonb(greatest(0, coalesce((v_slot->>'reserved')::int, 0) - v_row.quantity))
        ),
        '{sold}',
        to_jsonb(coalesce((v_slot->>'sold')::int, 0) + v_row.quantity)
      );
      v_map := jsonb_set(v_map, array[v_key], v_slot);

      update public.products
      set size_inventory = v_map,
          updated_at = now()
      where id = v_row.product_id;
    end if;
  end if;

  update public.product_inventory_reservations
  set status = 'completed', updated_at = now()
  where id = p_reservation_id;

  perform public.product_inventory_recompute_totals(v_row.product_id);
end;
$$;

create or replace function public.product_inventory_expire_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select id
    from public.product_inventory_reservations
    where status = 'active'
      and expires_at is not null
      and expires_at < now()
  loop
    perform public.product_inventory_release_reservation(v_row.id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.product_inventory_recompute_totals(uuid) from public;
grant execute on function public.product_inventory_recompute_totals(uuid) to authenticated, service_role;

revoke all on function public.product_inventory_apply_map(uuid, jsonb) from public;
grant execute on function public.product_inventory_apply_map(uuid, jsonb) to authenticated, service_role;

revoke all on function public.product_inventory_reserve(uuid, text, integer, text, uuid, uuid, integer) from public;
grant execute on function public.product_inventory_reserve(uuid, text, integer, text, uuid, uuid, integer) to authenticated, service_role;

revoke all on function public.product_inventory_release_reservation(uuid) from public;
grant execute on function public.product_inventory_release_reservation(uuid) to authenticated, service_role;

revoke all on function public.product_inventory_complete_reservation(uuid) from public;
grant execute on function public.product_inventory_complete_reservation(uuid) to authenticated, service_role;

revoke all on function public.product_inventory_expire_stale_reservations() from public;
grant execute on function public.product_inventory_expire_stale_reservations() to service_role;
