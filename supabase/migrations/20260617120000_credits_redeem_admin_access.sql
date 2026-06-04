-- Align credit-reward redemption eligibility with Blackcard full-access rules (admin, override, subscription, founding).

create or replace function public.resolve_profile_membership_tier(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.profiles p
      where p.id = target_user_id
        and p.is_founding_blackcard = true
    ) then 'founding'
    when public.is_profile_admin(target_user_id)
      or public.profile_has_admin_blackcard_override(target_user_id)
      or exists (
        select 1
        from public.subscriptions s
        where s.user_id = target_user_id
          and s.status in ('active', 'trialing')
          and (s.current_period_end is null or s.current_period_end >= now())
      ) then 'blackcard'
    else 'free'
  end;
$$;

create or replace function public.crimson_credits_member_can_redeem(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.resolve_profile_membership_tier(p_user_id) in ('blackcard', 'founding');
$$;

-- Deactivate linked reward rows when a product is converted to merch (preserve redemption history).
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
