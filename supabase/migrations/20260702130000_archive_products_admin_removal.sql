-- Add a true product archive state so admin removal does not break order history.

alter table public.products drop constraint if exists products_status_check;

alter table public.products
  add constraint products_status_check
  check (status in ('in_stock', 'out_of_stock', 'waitlist', 'coming_soon', 'archived'));

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
  v_is_active boolean;
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
      update public.crimson_credit_rewards r
      set is_active = false, updated_at = now()
      where r.id = v_product.credit_reward_id;

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

  v_is_active := case
    when v_product.status in ('out_of_stock', 'sold-out', 'coming_soon', 'archived') then false
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
      is_active = v_is_active,
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
      v_is_active,
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
