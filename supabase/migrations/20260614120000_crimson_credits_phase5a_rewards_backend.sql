-- Crimson Credits Phase 5A: rewards catalog, redemptions, redeem + admin status RPCs.
-- No earning logic changes. All writes via security definer functions only.

-- ---------------------------------------------------------------------------
-- Rewards catalog
-- ---------------------------------------------------------------------------
create table if not exists public.crimson_credit_rewards (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  description text,
  credit_cost integer not null,
  reward_category text not null,
  reward_kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  image_path text,
  inventory_total integer,
  inventory_remaining integer,
  requires_shirt_size boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crimson_credit_rewards_slug_key unique (slug),
  constraint crimson_credit_rewards_credit_cost_positive check (credit_cost > 0),
  constraint crimson_credit_rewards_category_check check (
    reward_category in ('cash', 'community')
  ),
  constraint crimson_credit_rewards_kind_check check (
    reward_kind in ('merch_discount', 'cash_value', 'physical')
  ),
  constraint crimson_credit_rewards_inventory_nonnegative check (
    inventory_total is null or inventory_total >= 0
  ),
  constraint crimson_credit_rewards_inventory_remaining_valid check (
    inventory_remaining is null
    or (inventory_remaining >= 0 and (inventory_total is null or inventory_remaining <= inventory_total))
  )
);

create index if not exists crimson_credit_rewards_active_sort_idx
  on public.crimson_credit_rewards (is_active, sort_order, credit_cost);

-- ---------------------------------------------------------------------------
-- Redemptions
-- ---------------------------------------------------------------------------
create table if not exists public.crimson_credit_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.crimson_credit_rewards(id) on delete restrict,
  reward_slug text not null,
  reward_title text not null,
  reward_category text not null,
  reward_kind text not null,
  credits_spent integer not null,
  status text not null default 'pending',
  shirt_size text,
  fulfillment_notes text,
  debit_transaction_id uuid references public.crimson_credit_transactions(id) on delete set null,
  refund_transaction_id uuid references public.crimson_credit_transactions(id) on delete set null,
  status_updated_by uuid references auth.users(id) on delete set null,
  status_updated_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crimson_credit_redemptions_credits_spent_positive check (credits_spent > 0),
  constraint crimson_credit_redemptions_status_check check (
    status in ('pending', 'approved', 'fulfilled', 'cancelled')
  ),
  constraint crimson_credit_redemptions_category_check check (
    reward_category in ('cash', 'community')
  ),
  constraint crimson_credit_redemptions_shirt_size_check check (
    shirt_size is null or shirt_size in ('S', 'M', 'L', 'XL', '2XL')
  )
);

create index if not exists crimson_credit_redemptions_user_created_idx
  on public.crimson_credit_redemptions (user_id, created_at desc);

create index if not exists crimson_credit_redemptions_reward_id_idx
  on public.crimson_credit_redemptions (reward_id);

create index if not exists crimson_credit_redemptions_status_idx
  on public.crimson_credit_redemptions (status, created_at desc);

drop trigger if exists touch_crimson_credit_rewards_updated_at on public.crimson_credit_rewards;
create trigger touch_crimson_credit_rewards_updated_at
before update on public.crimson_credit_rewards
for each row execute function public.touch_updated_at();

drop trigger if exists touch_crimson_credit_redemptions_updated_at on public.crimson_credit_redemptions;
create trigger touch_crimson_credit_redemptions_updated_at
before update on public.crimson_credit_redemptions
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — read-only for members; no client writes
-- ---------------------------------------------------------------------------
alter table public.crimson_credit_rewards enable row level security;
alter table public.crimson_credit_redemptions enable row level security;

drop policy if exists "Authenticated users read active credit rewards" on public.crimson_credit_rewards;
create policy "Authenticated users read active credit rewards"
on public.crimson_credit_rewards
for select
to authenticated
using (
  is_active = true
  or public.is_profile_admin(auth.uid())
);

drop policy if exists "Users read own credit redemptions" on public.crimson_credit_redemptions;
create policy "Users read own credit redemptions"
on public.crimson_credit_redemptions
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_profile_admin(auth.uid())
);

revoke all on public.crimson_credit_rewards from public;
revoke all on public.crimson_credit_redemptions from public;

grant select on public.crimson_credit_rewards to authenticated;
grant select on public.crimson_credit_redemptions to authenticated;
grant all on public.crimson_credit_rewards to service_role;
grant all on public.crimson_credit_redemptions to service_role;

-- ---------------------------------------------------------------------------
-- Reward image storage (admin upload in a later phase)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crimson-credit-reward-images',
  'crimson-credit-reward-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Crimson credit reward images are public" on storage.objects;
create policy "Crimson credit reward images are public"
on storage.objects
for select
to public
using (bucket_id = 'crimson-credit-reward-images');

drop policy if exists "Admins can upload crimson credit reward images" on storage.objects;
create policy "Admins can upload crimson credit reward images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'crimson-credit-reward-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

drop policy if exists "Admins can update crimson credit reward images" on storage.objects;
create policy "Admins can update crimson credit reward images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'crimson-credit-reward-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
)
with check (
  bucket_id = 'crimson-credit-reward-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

drop policy if exists "Admins can delete crimson credit reward images" on storage.objects;
create policy "Admins can delete crimson credit reward images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'crimson-credit-reward-images'
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.status = 'active'
  )
);

-- ---------------------------------------------------------------------------
-- Launch reward seeds (editable rows)
-- ---------------------------------------------------------------------------
insert into public.crimson_credit_rewards (
  slug,
  title,
  description,
  credit_cost,
  reward_category,
  reward_kind,
  metadata,
  inventory_total,
  inventory_remaining,
  requires_shirt_size,
  is_active,
  sort_order
)
values
  (
    'cash-merch-discount-5',
    '5% Merch Discount',
    'Single-use merch discount code (cash-value reward).',
    100,
    'cash',
    'merch_discount',
    jsonb_build_object('discount_percent', 5),
    null,
    null,
    false,
    true,
    10
  ),
  (
    'cash-merch-discount-10',
    '10% Merch Discount',
    'Single-use merch discount code (cash-value reward).',
    250,
    'cash',
    'merch_discount',
    jsonb_build_object('discount_percent', 10),
    null,
    null,
    false,
    true,
    20
  ),
  (
    'cash-reward-25',
    '$25 Reward Value',
    'Cash-value member reward (counts toward monthly cash redemption cap).',
    500,
    'cash',
    'cash_value',
    jsonb_build_object('reward_value_usd', 25),
    null,
    null,
    false,
    true,
    30
  ),
  (
    'community-sticker',
    'Sticker',
    'Community reward — does not count toward monthly cash redemption cap.',
    100,
    'community',
    'physical',
    '{}'::jsonb,
    null,
    null,
    false,
    true,
    40
  ),
  (
    'community-sticker-pack',
    'Sticker Pack',
    'Community reward — does not count toward monthly cash redemption cap.',
    250,
    'community',
    'physical',
    '{}'::jsonb,
    null,
    null,
    false,
    true,
    50
  ),
  (
    'community-keychain',
    'Keychain',
    'Community reward — does not count toward monthly cash redemption cap.',
    500,
    'community',
    'physical',
    '{}'::jsonb,
    null,
    null,
    false,
    true,
    60
  ),
  (
    'community-free-shirt',
    'Free Shirt',
    'Community reward with limited inventory. Select shirt size at redemption.',
    1000,
    'community',
    'physical',
    '{}'::jsonb,
    50,
    50,
    true,
    true,
    70
  )
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  credit_cost = excluded.credit_cost,
  reward_category = excluded.reward_category,
  reward_kind = excluded.reward_kind,
  metadata = excluded.metadata,
  inventory_total = excluded.inventory_total,
  inventory_remaining = excluded.inventory_remaining,
  requires_shirt_size = excluded.requires_shirt_size,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.crimson_credits_monthly_cash_redemption_cap()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 500;
$$;

revoke all on function public.crimson_credits_monthly_cash_redemption_cap() from public;
grant execute on function public.crimson_credits_monthly_cash_redemption_cap() to authenticated, service_role;

create or replace function public.crimson_credits_monthly_cash_redemption_used(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(r.credits_spent), 0)::integer
  from public.crimson_credit_redemptions r
  where r.user_id = p_user_id
    and r.reward_category = 'cash'
    and r.status in ('pending', 'approved', 'fulfilled')
    and r.created_at >= date_trunc('month', timezone('utc', now()));
$$;

revoke all on function public.crimson_credits_monthly_cash_redemption_used(uuid) from public;
grant execute on function public.crimson_credits_monthly_cash_redemption_used(uuid) to authenticated, service_role;

create or replace function public.crimson_credits_member_can_redeem(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.resolve_profile_membership_tier(p_user_id) in ('blackcard', 'founding');
$$;

revoke all on function public.crimson_credits_member_can_redeem(uuid) from public;
grant execute on function public.crimson_credits_member_can_redeem(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Redeem reward (member; Blackcard / Founding only)
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
  v_balance integer := 0;
  v_cash_used integer := 0;
  v_cash_cap integer := public.crimson_credits_monthly_cash_redemption_cap();
  v_redemption_id uuid;
  v_tx_id uuid;
  v_shirt text;
  v_meta jsonb;
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

  if v_reward.inventory_remaining is not null and v_reward.inventory_remaining <= 0 then
    raise exception 'Reward is out of stock';
  end if;

  v_shirt := nullif(upper(btrim(coalesce(p_shirt_size, ''))), '');

  if v_reward.requires_shirt_size then
    if v_shirt is null or v_shirt not in ('S', 'M', 'L', 'XL', '2XL') then
      raise exception 'shirt_size is required (S, M, L, XL, 2XL)';
    end if;
  elsif v_shirt is not null then
    raise exception 'shirt_size is not required for this reward';
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
    'counts_toward_cash_cap', v_reward.reward_category = 'cash'
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

  if v_reward.inventory_remaining is not null then
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
    jsonb_build_object('reward_metadata', v_reward.metadata)
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

revoke all on function public.redeem_crimson_credit_reward(uuid, text) from public;
grant execute on function public.redeem_crimson_credit_reward(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin redemption status + safe cancel/refund
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
  v_new_status text := lower(btrim(coalesce(p_status, '')));
  v_refund_tx_id uuid;
  v_balance integer := 0;
  v_notes text;
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

    if found and v_reward.inventory_remaining is not null then
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

revoke all on function public.admin_update_crimson_credit_redemption(uuid, text, uuid, text, text) from public;
grant execute on function public.admin_update_crimson_credit_redemption(uuid, text, uuid, text, text) to service_role;
