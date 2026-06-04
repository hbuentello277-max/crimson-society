-- Unify credit rewards under shop products (single catalog) while keeping redemption RPCs.

alter table public.products
  add column if not exists product_type text not null default 'cash_product',
  add column if not exists credit_cost integer,
  add column if not exists reward_category text,
  add column if not exists reward_kind text,
  add column if not exists requires_shirt_size boolean not null default false,
  add column if not exists inventory_total integer,
  add column if not exists inventory_remaining integer,
  add column if not exists credit_reward_id uuid references public.crimson_credit_rewards(id) on delete set null;

alter table public.products drop constraint if exists products_product_type_check;
alter table public.products add constraint products_product_type_check
  check (product_type in ('cash_product', 'credit_reward'));

alter table public.products drop constraint if exists products_credit_cost_positive;
alter table public.products add constraint products_credit_cost_positive
  check (credit_cost is null or credit_cost > 0);

alter table public.products drop constraint if exists products_reward_category_check;
alter table public.products add constraint products_reward_category_check
  check (reward_category is null or reward_category in ('cash', 'community'));

alter table public.products drop constraint if exists products_reward_kind_check;
alter table public.products add constraint products_reward_kind_check
  check (
    reward_kind is null
    or reward_kind in ('merch_discount', 'cash_value', 'physical')
  );

create index if not exists products_product_type_sort_idx
  on public.products (product_type, sort_order);

-- Sync shop credit-reward product → crimson_credit_rewards (source of truth for redeem RPC).
create or replace function public.sync_shop_credit_reward_product(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_reward_id uuid;
  v_slug text;
  v_status text;
begin
  if p_product_id is null then
    raise exception 'product_id is required';
  end if;

  select * into v_product from public.products p where p.id = p_product_id;

  if not found then
    raise exception 'Product not found';
  end if;

  if v_product.product_type is distinct from 'credit_reward' then
    if v_product.credit_reward_id is not null then
      update public.products set credit_reward_id = null where id = v_product.id;
    end if;
    return null;
  end if;

  if v_product.credit_cost is null or v_product.credit_cost <= 0 then
    raise exception 'Credit reward products require credit_cost > 0';
  end if;

  if v_product.reward_category is null then
    raise exception 'Credit reward products require reward_category';
  end if;

  if v_product.reward_kind is null then
    raise exception 'Credit reward products require reward_kind';
  end if;

  v_slug := btrim(v_product.slug);
  if v_slug = '' then
    raise exception 'Credit reward products require a slug';
  end if;

  v_status := case
    when v_product.status in ('out_of_stock', 'sold-out') then false
    when v_product.status = 'coming_soon' then false
    else true
  end;

  if v_product.credit_reward_id is not null then
    update public.crimson_credit_rewards r
    set
      slug = v_slug,
      title = v_product.name,
      description = nullif(btrim(v_product.description), ''),
      credit_cost = v_product.credit_cost,
      reward_category = v_product.reward_category,
      reward_kind = v_product.reward_kind,
      inventory_total = v_product.inventory_total,
      inventory_remaining = v_product.inventory_remaining,
      requires_shirt_size = v_product.requires_shirt_size,
      is_active = v_status,
      sort_order = v_product.sort_order,
      updated_at = now()
    where r.id = v_product.credit_reward_id
    returning r.id into v_reward_id;
  else
    insert into public.crimson_credit_rewards (
      slug,
      title,
      description,
      credit_cost,
      reward_category,
      reward_kind,
      inventory_total,
      inventory_remaining,
      requires_shirt_size,
      is_active,
      sort_order
    )
    values (
      v_slug,
      v_product.name,
      nullif(btrim(v_product.description), ''),
      v_product.credit_cost,
      v_product.reward_category,
      v_product.reward_kind,
      v_product.inventory_total,
      v_product.inventory_remaining,
      v_product.requires_shirt_size,
      v_status,
      v_product.sort_order
    )
    on conflict (slug) do update
    set
      title = excluded.title,
      description = excluded.description,
      credit_cost = excluded.credit_cost,
      reward_category = excluded.reward_category,
      reward_kind = excluded.reward_kind,
      inventory_total = excluded.inventory_total,
      inventory_remaining = excluded.inventory_remaining,
      requires_shirt_size = excluded.requires_shirt_size,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order,
      updated_at = now()
    returning id into v_reward_id;

    update public.products
    set credit_reward_id = v_reward_id
    where id = v_product.id;
  end if;

  return v_reward_id;
end;
$$;

revoke all on function public.sync_shop_credit_reward_product(uuid) from public;
grant execute on function public.sync_shop_credit_reward_product(uuid) to service_role;

-- Backfill shop products from existing launch rewards.
insert into public.products (
  name,
  slug,
  tagline,
  description,
  price,
  category,
  images,
  sizes,
  status,
  sort_order,
  product_type,
  credit_cost,
  reward_category,
  reward_kind,
  requires_shirt_size,
  inventory_total,
  inventory_remaining,
  credit_reward_id
)
select
  r.title,
  r.slug,
  coalesce(r.reward_category, 'community') || ' reward',
  coalesce(r.description, ''),
  0,
  'accessories',
  case
    when r.image_path is not null and r.image_path <> ''
      then array[r.image_path]
    else '{}'::text[]
  end,
  case when r.requires_shirt_size then array['S', 'M', 'L', 'XL', '2XL'] else '{}'::text[] end,
  case
    when r.is_active = false then 'coming_soon'
    when r.inventory_remaining is not null and r.inventory_remaining <= 0 then 'out_of_stock'
    else 'in_stock'
  end,
  r.sort_order,
  'credit_reward',
  r.credit_cost,
  r.reward_category,
  r.reward_kind,
  r.requires_shirt_size,
  r.inventory_total,
  r.inventory_remaining,
  r.id
from public.crimson_credit_rewards r
where not exists (
  select 1 from public.products p where p.credit_reward_id = r.id or p.slug = r.slug
);

-- Link any pre-existing products by slug.
update public.products p
set credit_reward_id = r.id,
    product_type = 'credit_reward',
    credit_cost = coalesce(p.credit_cost, r.credit_cost),
    reward_category = coalesce(p.reward_category, r.reward_category),
    reward_kind = coalesce(p.reward_kind, r.reward_kind),
    requires_shirt_size = coalesce(p.requires_shirt_size, r.requires_shirt_size),
    inventory_total = coalesce(p.inventory_total, r.inventory_total),
    inventory_remaining = coalesce(p.inventory_remaining, r.inventory_remaining)
from public.crimson_credit_rewards r
where p.slug = r.slug
  and p.credit_reward_id is null;

update public.products
set product_type = 'cash_product'
where product_type is null or product_type = '';
