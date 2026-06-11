-- Profile & Community polish: achievement awards and backfill-safe milestone sync.

create or replace function public.award_crimson_credits(
  p_target_user_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_reason text default null,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb := public.crimson_credits_economy_settings();
  v_monthly_cap integer;
  v_month_start timestamptz := date_trunc('month', timezone('utc', now()));
  v_monthly_earned integer := 0;
  v_award integer := 0;
  v_balance_row public.crimson_credits%rowtype;
  v_existing_id uuid;
  v_meta jsonb;
  v_transaction_type text;
begin
  if p_target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  v_transaction_type := btrim(coalesce(p_transaction_type, ''));
  if v_transaction_type = '' then
    raise exception 'transaction_type is required';
  end if;

  v_monthly_cap := greatest(0, coalesce((v_settings->>'monthly_earn_cap')::integer, 500));
  v_meta := coalesce(p_metadata, '{}'::jsonb);

  if p_idempotency_key is not null and btrim(p_idempotency_key) <> '' then
    select t.id
    into v_existing_id
    from public.crimson_credit_transactions t
    where t.user_id = p_target_user_id
      and t.metadata ->> 'idempotency_key' = btrim(p_idempotency_key)
    limit 1;

    if v_existing_id is not null then
      select coalesce(sum(t.amount), 0)::integer
      into v_monthly_earned
      from public.crimson_credit_transactions t
      where t.user_id = p_target_user_id
        and t.amount > 0
        and t.transaction_type not in ('admin_adjustment', 'achievement_milestone')
        and t.created_at >= v_month_start;

      select * into v_balance_row
      from public.crimson_credits c
      where c.user_id = p_target_user_id;

      return jsonb_build_object(
        'awarded', 0,
        'duplicate', true,
        'monthly_earned', v_monthly_earned,
        'monthly_cap', v_monthly_cap,
        'credits_balance', coalesce(v_balance_row.credits_balance, 0)
      );
    end if;

    v_meta := v_meta || jsonb_build_object('idempotency_key', btrim(p_idempotency_key));
  end if;

  select coalesce(sum(t.amount), 0)::integer
  into v_monthly_earned
  from public.crimson_credit_transactions t
  where t.user_id = p_target_user_id
    and t.amount > 0
    and t.transaction_type not in ('admin_adjustment', 'achievement_milestone')
    and t.created_at >= v_month_start;

  if v_transaction_type = 'achievement_milestone' then
    v_award := p_amount;
  else
    v_award := least(p_amount, greatest(0, v_monthly_cap - v_monthly_earned));
  end if;

  if v_award <= 0 then
    select * into v_balance_row
    from public.crimson_credits c
    where c.user_id = p_target_user_id;

    return jsonb_build_object(
      'awarded', 0,
      'duplicate', false,
      'capped', true,
      'monthly_earned', v_monthly_earned,
      'monthly_cap', v_monthly_cap,
      'credits_balance', coalesce(v_balance_row.credits_balance, 0)
    );
  end if;

  insert into public.crimson_credits (user_id, credits_balance, lifetime_credits_earned)
  values (p_target_user_id, 0, 0)
  on conflict (user_id) do nothing;

  insert into public.crimson_credit_transactions (
    user_id,
    amount,
    transaction_type,
    reason,
    metadata
  )
  values (
    p_target_user_id,
    v_award,
    v_transaction_type,
    p_reason,
    v_meta
  );

  update public.crimson_credits c
  set credits_balance = c.credits_balance + v_award,
      lifetime_credits_earned = c.lifetime_credits_earned + v_award
  where c.user_id = p_target_user_id
  returning * into v_balance_row;

  if v_transaction_type <> 'achievement_milestone' then
    v_monthly_earned := v_monthly_earned + v_award;
  end if;

  return jsonb_build_object(
    'awarded', v_award,
    'duplicate', false,
    'capped', v_transaction_type <> 'achievement_milestone' and v_award < p_amount,
    'monthly_earned', v_monthly_earned,
    'monthly_cap', v_monthly_cap,
    'credits_balance', v_balance_row.credits_balance
  );
end;
$$;

revoke all on function public.award_crimson_credits(uuid, integer, text, text, text, jsonb) from public;
grant execute on function public.award_crimson_credits(uuid, integer, text, text, text, jsonb) to service_role;

create or replace function public.try_award_achievement_milestones(p_target_user_id uuid default auth.uid())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := coalesce(p_target_user_id, auth.uid());
  v_attended integer := 0;
  v_hosted integer := 0;
  v_referrals integer := 0;
  v_blackcard integer := 0;
  v_awarded jsonb := '[]'::jsonb;
  v_result jsonb;
  v_milestone record;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() is distinct from v_uid
     and auth.role() <> 'service_role'
     and not public.is_profile_admin(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  v_attended := public.count_user_attended_meets(v_uid);
  v_hosted := public.count_user_hosted_meets(v_uid);
  v_referrals := public.count_user_referrals(v_uid);
  v_blackcard := public.count_user_blackcard_conversions(v_uid);

  for v_milestone in
    select *
    from (
      values
        ('meet_attendance', 10, 50, 'Attended 10 Meets.'),
        ('meet_attendance', 25, 100, 'Attended 25 Meets.'),
        ('meet_attendance', 50, 250, 'Attended 50 Meets.'),
        ('meet_attendance', 100, 500, 'Attended 100 Meets.'),
        ('meet_hosting', 5, 50, 'Hosted 5 Meets.'),
        ('meet_hosting', 15, 150, 'Hosted 15 Meets.'),
        ('meet_hosting', 30, 300, 'Hosted 30 Meets.'),
        ('meet_hosting', 50, 500, 'Hosted 50 Meets.'),
        ('referrals', 3, 75, 'Referred 3 Riders.'),
        ('referrals', 10, 200, 'Referred 10 Riders.'),
        ('referrals', 25, 500, 'Referred 25 Riders.'),
        ('referrals', 50, 1000, 'Referred 50 Riders.'),
        ('blackcard_conversions', 3, 150, '3 Blackcard Conversions.'),
        ('blackcard_conversions', 10, 500, '10 Blackcard Conversions.'),
        ('blackcard_conversions', 25, 1500, '25 Blackcard Conversions.')
    ) as milestones(category, threshold, amount, reason)
  loop
    if (
      (v_milestone.category = 'meet_attendance' and v_attended >= v_milestone.threshold)
      or (v_milestone.category = 'meet_hosting' and v_hosted >= v_milestone.threshold)
      or (v_milestone.category = 'referrals' and v_referrals >= v_milestone.threshold)
      or (v_milestone.category = 'blackcard_conversions' and v_blackcard >= v_milestone.threshold)
    ) then
      v_result := public.try_award_single_achievement_milestone(
        v_uid,
        v_milestone.category,
        v_milestone.threshold,
        v_milestone.amount,
        v_milestone.reason
      );

      if coalesce((v_result->>'awarded')::integer, 0) > 0 then
        v_awarded := v_awarded || jsonb_build_array(v_result);
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'counts', jsonb_build_object(
      'attended', v_attended,
      'hosted', v_hosted,
      'referrals', v_referrals,
      'blackcard_conversions', v_blackcard
    ),
    'awarded', v_awarded
  );
end;
$$;

revoke all on function public.try_award_achievement_milestones(uuid) from public;
grant execute on function public.try_award_achievement_milestones(uuid) to authenticated, service_role;
