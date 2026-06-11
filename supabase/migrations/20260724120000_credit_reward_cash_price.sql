-- Credit rewards: optional cash purchase price on the reward product itself (products.price).
-- When set, members can Buy Now via Stripe without a linked merch product.
-- linked_merch_product_id remains supported for backward compatibility.

comment on column public.products.price is
  'Merch: cash price. Credit rewards: optional Buy Now cash price when members cannot redeem with credits.';

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
  v_metadata jsonb;
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

  v_metadata := jsonb_build_object(
    'cash_price',
    case when coalesce(v_product.price, 0) > 0 then v_product.price else null end,
    'linked_merch_product_id',
    v_product.linked_merch_product_id
  );

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
      metadata = coalesce(r.metadata, '{}'::jsonb) || v_metadata,
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
      sort_order,
      metadata
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
      v_product.sort_order,
      v_metadata
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
      metadata = coalesce(crimson_credit_rewards.metadata, '{}'::jsonb) || excluded.metadata,
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
