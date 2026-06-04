-- Unify credit-reward inventory: products.size_inventory is source of truth;
-- crimson_credit_rewards.inventory_* mirrors products for legacy RPC compatibility.

-- ---------------------------------------------------------------------------
-- Inventory helpers (product = source of truth)
-- ---------------------------------------------------------------------------

create or replace function public.product_inventory_mirror_to_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_reward_id is null then
    return;
  end if;

  update public.crimson_credit_rewards r
  set
    inventory_total = p.inventory_total,
    inventory_remaining = p.inventory_remaining,
    updated_at = now()
  from public.products p
  where p.credit_reward_id = r.id
    and r.id = p_reward_id;
end;
$$;

create or replace function public.product_inventory_resolve_bucket_key(
  p_requires_shirt_size boolean,
  p_size_label text
)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p_requires_shirt_size, false) then coalesce(nullif(upper(btrim(p_size_label)), ''), '')
    else coalesce(nullif(upper(btrim(p_size_label)), ''), '_all')
  end;
$$;

create or replace function public.product_inventory_assert_available(
  p_product_id uuid,
  p_requires_shirt_size boolean,
  p_size_label text,
  p_quantity integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_map jsonb;
  v_key text;
  v_slot jsonb;
  v_available integer;
begin
  if p_product_id is null then
    return;
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  select * into v_product
  from public.products p
  where p.id = p_product_id;

  if not found then
    raise exception 'Product not found';
  end if;

  v_map := v_product.size_inventory;

  if v_map is not null and v_map <> '{}'::jsonb then
    v_key := public.product_inventory_resolve_bucket_key(p_requires_shirt_size, p_size_label);

    if v_key = '' then
      raise exception 'shirt_size is required for this reward';
    end if;

    v_slot := v_map -> v_key;

    if v_slot is null then
      raise exception 'Size not available for this reward';
    end if;

    v_available := coalesce((v_slot ->> 'available')::integer, 0);

    if v_available < p_quantity then
      raise exception 'Reward is out of stock';
    end if;

    return;
  end if;

  if v_product.inventory_remaining is not null and v_product.inventory_remaining < p_quantity then
    raise exception 'Reward is out of stock';
  end if;
end;
$$;

create or replace function public.product_inventory_decrement_for_redemption(
  p_product_id uuid,
  p_requires_shirt_size boolean,
  p_size_label text,
  p_quantity integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_map jsonb;
  v_key text;
  v_slot jsonb;
  v_available integer;
  v_sold integer;
  v_total integer;
begin
  if p_product_id is null then
    return;
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  select * into v_product
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  v_map := v_product.size_inventory;

  if v_map is not null and v_map <> '{}'::jsonb then
    v_key := public.product_inventory_resolve_bucket_key(p_requires_shirt_size, p_size_label);

    if v_key = '' then
      raise exception 'shirt_size is required for this reward';
    end if;

    v_slot := v_map -> v_key;

    if v_slot is null then
      raise exception 'Size not available for this reward';
    end if;

    v_available := coalesce((v_slot ->> 'available')::integer, 0);
    v_sold := coalesce((v_slot ->> 'sold')::integer, 0);
    v_total := coalesce((v_slot ->> 'total')::integer, 0);

    if v_available < p_quantity then
      raise exception 'Reward is out of stock';
    end if;

    v_slot := jsonb_set(
      jsonb_set(v_slot, '{available}', to_jsonb(v_available - p_quantity)),
      '{sold}',
      to_jsonb(v_sold + p_quantity)
    );

    v_map := jsonb_set(v_map, array[v_key], v_slot);

    update public.products
    set size_inventory = v_map,
        updated_at = now()
    where id = p_product_id;

    perform public.product_inventory_recompute_totals(p_product_id);
    return;
  end if;

  if v_product.inventory_remaining is not null then
    update public.products
    set inventory_remaining = inventory_remaining - p_quantity,
        updated_at = now()
    where id = p_product_id
      and inventory_remaining >= p_quantity;

    if not found then
      raise exception 'Reward is out of stock';
    end if;
  end if;
end;
$$;

create or replace function public.product_inventory_restore_for_cancellation(
  p_product_id uuid,
  p_requires_shirt_size boolean,
  p_size_label text,
  p_quantity integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_map jsonb;
  v_key text;
  v_slot jsonb;
  v_available integer;
  v_sold integer;
  v_total integer;
begin
  if p_product_id is null then
    return;
  end if;

  if p_quantity is null or p_quantity < 1 then
    return;
  end if;

  select * into v_product
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    return;
  end if;

  v_map := v_product.size_inventory;

  if v_map is not null and v_map <> '{}'::jsonb then
    v_key := public.product_inventory_resolve_bucket_key(p_requires_shirt_size, p_size_label);

    if v_key = '' then
      v_key := '_all';
    end if;

    v_slot := v_map -> v_key;

    if v_slot is null then
      return;
    end if;

    v_available := coalesce((v_slot ->> 'available')::integer, 0);
    v_sold := coalesce((v_slot ->> 'sold')::integer, 0);
    v_total := coalesce((v_slot ->> 'total')::integer, 0);

    v_slot := jsonb_set(
      jsonb_set(
        v_slot,
        '{available}',
        to_jsonb(least(v_total, v_available + p_quantity))
      ),
      '{sold}',
      to_jsonb(greatest(0, v_sold - p_quantity))
    );

    v_map := jsonb_set(v_map, array[v_key], v_slot);

    update public.products
    set size_inventory = v_map,
        updated_at = now()
    where id = p_product_id;

    perform public.product_inventory_recompute_totals(p_product_id);
    return;
  end if;

  if v_product.inventory_remaining is not null then
    update public.products
    set inventory_remaining = least(
        coalesce(inventory_total, inventory_remaining + p_quantity),
        inventory_remaining + p_quantity
      ),
        updated_at = now()
    where id = p_product_id;
  end if;
end;
$$;

revoke all on function public.product_inventory_mirror_to_reward(uuid) from public;
grant execute on function public.product_inventory_mirror_to_reward(uuid) to authenticated, service_role;

revoke all on function public.product_inventory_resolve_bucket_key(boolean, text) from public;
grant execute on function public.product_inventory_resolve_bucket_key(boolean, text) to authenticated, service_role;

revoke all on function public.product_inventory_assert_available(uuid, boolean, text, integer) from public;
grant execute on function public.product_inventory_assert_available(uuid, boolean, text, integer) to authenticated, service_role;

revoke all on function public.product_inventory_decrement_for_redemption(uuid, boolean, text, integer) from public;
grant execute on function public.product_inventory_decrement_for_redemption(uuid, boolean, text, integer) to authenticated, service_role;

revoke all on function public.product_inventory_restore_for_cancellation(uuid, boolean, text, integer) from public;
grant execute on function public.product_inventory_restore_for_cancellation(uuid, boolean, text, integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Sync: products → reward mirror (catalog fields + inventory scalars)
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Redeem: decrement products.size_inventory, mirror to reward row
-- ---------------------------------------------------------------------------

create or replace function public.redeem_crimson_credit_reward(
  p_reward_id uuid,
  p_shirt_size text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tier text;
  v_reward public.crimson_credit_rewards%rowtype;
  v_product public.products%rowtype;
  v_balance integer := 0;
  v_cash_used integer := 0;
  v_cash_cap integer := public.crimson_credits_monthly_cash_redemption_cap();
  v_redemption_id uuid;
  v_tx_id uuid;
  v_shirt text;
  v_meta jsonb;
  v_has_limited_stock boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_reward_id is null then
    raise exception 'reward_id is required';
  end if;

  v_tier := public.resolve_profile_membership_tier(v_uid);

  if v_tier not in ('blackcard', 'founding') then
    raise exception 'Blackcard or Founding membership is required to redeem';
  end if;

  select * into v_reward
  from public.crimson_credit_rewards r
  where r.id = p_reward_id
  for update;

  if not found then
    raise exception 'Reward not found';
  end if;

  if not v_reward.is_active then
    raise exception 'Reward is not active';
  end if;

  select * into v_product
  from public.products p
  where p.credit_reward_id = v_reward.id
  for update;

  v_shirt := nullif(upper(btrim(coalesce(p_shirt_size, ''))), '');

  if v_reward.requires_shirt_size then
    if v_shirt is null or v_shirt not in ('S', 'M', 'L', 'XL', '2XL') then
      raise exception 'shirt_size is required (S, M, L, XL, 2XL)';
    end if;
  elsif v_shirt is not null then
    raise exception 'shirt_size is not required for this reward';
  end if;

  v_has_limited_stock :=
    v_product.id is not null
    and (
      (v_product.size_inventory is not null and v_product.size_inventory <> '{}'::jsonb)
      or v_product.inventory_remaining is not null
    );

  if v_has_limited_stock then
    perform public.product_inventory_assert_available(
      v_product.id,
      v_reward.requires_shirt_size,
      v_shirt,
      1
    );
  elsif v_reward.inventory_remaining is not null and v_reward.inventory_remaining <= 0 then
    raise exception 'Reward is out of stock';
  end if;

  insert into public.crimson_credits (user_id, credits_balance, lifetime_credits_earned, lifetime_credits_spent)
  values (v_uid, 0, 0, 0)
  on conflict (user_id) do nothing;

  perform 1
  from public.crimson_credits c
  where c.user_id = v_uid
  for update;

  select coalesce(c.credits_balance, 0)
  into v_balance
  from public.crimson_credits c
  where c.user_id = v_uid;

  if v_balance < v_reward.credit_cost then
    raise exception 'Insufficient credits (have %, need %).', v_balance, v_reward.credit_cost;
  end if;

  if v_reward.reward_category = 'cash' then
    v_cash_used := public.crimson_credits_monthly_cash_redemption_used(v_uid);

    if v_cash_used + v_reward.credit_cost > v_cash_cap then
      raise exception
        'Monthly cash-value redemption cap exceeded (used % of % credits this month).',
        v_cash_used,
        v_cash_cap;
    end if;
  end if;

  v_meta := jsonb_build_object(
    'reward_id', v_reward.id,
    'reward_slug', v_reward.slug,
    'reward_category', v_reward.reward_category,
    'reward_kind', v_reward.reward_kind,
    'counts_toward_cash_cap', v_reward.reward_category = 'cash',
    'product_id', v_product.id
  );

  insert into public.crimson_credit_transactions (
    user_id,
    amount,
    transaction_type,
    reason,
    metadata
  )
  values (
    v_uid,
    -v_reward.credit_cost,
    'reward_redemption',
    'Redeemed: ' || v_reward.title,
    v_meta
  )
  returning id into v_tx_id;

  update public.crimson_credits c
  set credits_balance = c.credits_balance - v_reward.credit_cost,
      lifetime_credits_spent = c.lifetime_credits_spent + v_reward.credit_cost
  where c.user_id = v_uid;

  if v_has_limited_stock then
    perform public.product_inventory_decrement_for_redemption(
      v_product.id,
      v_reward.requires_shirt_size,
      v_shirt,
      1
    );
    perform public.product_inventory_mirror_to_reward(v_reward.id);
  elsif v_reward.inventory_remaining is not null then
    update public.crimson_credit_rewards r
    set inventory_remaining = r.inventory_remaining - 1
    where r.id = v_reward.id
      and r.inventory_remaining > 0;

    if not found then
      raise exception 'Reward is out of stock';
    end if;
  end if;

  insert into public.crimson_credit_redemptions (
    user_id,
    reward_id,
    reward_slug,
    reward_title,
    reward_category,
    reward_kind,
    credits_spent,
    status,
    shirt_size,
    debit_transaction_id,
    metadata
  )
  values (
    v_uid,
    v_reward.id,
    v_reward.slug,
    v_reward.title,
    v_reward.reward_category,
    v_reward.reward_kind,
    v_reward.credit_cost,
    'pending',
    v_shirt,
    v_tx_id,
    jsonb_build_object('reward_metadata', v_reward.metadata, 'product_id', v_product.id)
  )
  returning id into v_redemption_id;

  update public.crimson_credit_transactions t
  set metadata = t.metadata || jsonb_build_object('redemption_id', v_redemption_id)
  where t.id = v_tx_id;

  select coalesce(c.credits_balance, 0)
  into v_balance
  from public.crimson_credits c
  where c.user_id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'redemption_id', v_redemption_id,
    'transaction_id', v_tx_id,
    'reward_id', v_reward.id,
    'reward_slug', v_reward.slug,
    'credits_spent', v_reward.credit_cost,
    'status', 'pending',
    'credits_balance', v_balance,
    'monthly_cash_redemption_used', public.crimson_credits_monthly_cash_redemption_used(v_uid),
    'monthly_cash_redemption_cap', v_cash_cap
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin cancel: restore products.size_inventory, mirror to reward row
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_crimson_credit_redemption(
  p_redemption_id uuid,
  p_status text,
  p_admin_id uuid,
  p_fulfillment_notes text default null,
  p_cancel_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption public.crimson_credit_redemptions%rowtype;
  v_reward public.crimson_credit_rewards%rowtype;
  v_product public.products%rowtype;
  v_new_status text := lower(btrim(coalesce(p_status, '')));
  v_refund_tx_id uuid;
  v_balance integer := 0;
  v_notes text;
  v_shirt text;
begin
  if p_redemption_id is null then
    raise exception 'redemption_id is required';
  end if;

  if p_admin_id is null then
    raise exception 'admin_id is required';
  end if;

  if not public.is_profile_admin(p_admin_id) then
    raise exception 'Forbidden';
  end if;

  if v_new_status not in ('pending', 'approved', 'fulfilled', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  select * into v_redemption
  from public.crimson_credit_redemptions r
  where r.id = p_redemption_id
  for update;

  if not found then
    raise exception 'Redemption not found';
  end if;

  if v_redemption.status = 'cancelled' and v_new_status <> 'cancelled' then
    raise exception 'Cancelled redemptions cannot change status';
  end if;

  if v_redemption.status = 'fulfilled' and v_new_status = 'cancelled' then
    raise exception 'Fulfilled redemptions cannot be cancelled';
  end if;

  v_notes := nullif(btrim(coalesce(p_fulfillment_notes, '')), '');

  if v_new_status = 'cancelled' then
    if v_redemption.status = 'cancelled' then
      return jsonb_build_object(
        'ok', true,
        'redemption_id', v_redemption.id,
        'status', v_redemption.status,
        'already_cancelled', true
      );
    end if;

    if v_redemption.refund_transaction_id is not null then
      raise exception 'Redemption already refunded';
    end if;

    insert into public.crimson_credit_transactions (
      user_id,
      amount,
      transaction_type,
      reason,
      metadata
    )
    values (
      v_redemption.user_id,
      v_redemption.credits_spent,
      'reward_redemption_refund',
      coalesce(nullif(btrim(p_cancel_reason), ''), 'Reward redemption cancelled'),
      jsonb_build_object(
        'redemption_id', v_redemption.id,
        'original_transaction_id', v_redemption.debit_transaction_id,
        'reward_slug', v_redemption.reward_slug,
        'admin_id', p_admin_id
      )
    )
    returning id into v_refund_tx_id;

    insert into public.crimson_credits (user_id, credits_balance, lifetime_credits_earned, lifetime_credits_spent)
    values (v_redemption.user_id, 0, 0, 0)
    on conflict (user_id) do nothing;

    update public.crimson_credits c
    set credits_balance = c.credits_balance + v_redemption.credits_spent,
        lifetime_credits_spent = greatest(0, c.lifetime_credits_spent - v_redemption.credits_spent)
    where c.user_id = v_redemption.user_id;

    select * into v_reward
    from public.crimson_credit_rewards r
    where r.id = v_redemption.reward_id
    for update;

    select * into v_product
    from public.products p
    where p.credit_reward_id = v_redemption.reward_id
    for update;

    v_shirt := nullif(upper(btrim(coalesce(v_redemption.shirt_size, ''))), '');

    if v_product.id is not null
      and (
        (v_product.size_inventory is not null and v_product.size_inventory <> '{}'::jsonb)
        or v_product.inventory_remaining is not null
      ) then
      perform public.product_inventory_restore_for_cancellation(
        v_product.id,
        coalesce(v_reward.requires_shirt_size, false),
        v_shirt,
        1
      );
      perform public.product_inventory_mirror_to_reward(v_reward.id);
    elsif v_reward.id is not null and v_reward.inventory_remaining is not null then
      update public.crimson_credit_rewards r
      set inventory_remaining = least(
        coalesce(r.inventory_total, r.inventory_remaining + 1),
        r.inventory_remaining + 1
      )
      where r.id = v_reward.id;
    end if;

    update public.crimson_credit_redemptions r
    set status = 'cancelled',
        refund_transaction_id = v_refund_tx_id,
        cancelled_at = now(),
        status_updated_by = p_admin_id,
        status_updated_at = now(),
        fulfillment_notes = coalesce(v_notes, r.fulfillment_notes),
        metadata = r.metadata || jsonb_build_object(
          'cancel_reason', coalesce(nullif(btrim(p_cancel_reason), ''), 'admin_cancelled')
        )
    where r.id = v_redemption.id
    returning * into v_redemption;
  else
    if v_redemption.status = 'cancelled' then
      raise exception 'Cannot update a cancelled redemption';
    end if;

    update public.crimson_credit_redemptions r
    set status = v_new_status,
        status_updated_by = p_admin_id,
        status_updated_at = now(),
        fulfillment_notes = coalesce(v_notes, r.fulfillment_notes)
    where r.id = v_redemption.id
    returning * into v_redemption;
  end if;

  select coalesce(c.credits_balance, 0)
  into v_balance
  from public.crimson_credits c
  where c.user_id = v_redemption.user_id;

  return jsonb_build_object(
    'ok', true,
    'redemption_id', v_redemption.id,
    'status', v_redemption.status,
    'refund_transaction_id', v_redemption.refund_transaction_id,
    'credits_balance', v_balance
  );
end;
$$;
