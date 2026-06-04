-- Member-facing referral dashboard (own stats + referred members; no private data leakage).

create or replace function public.get_own_referral_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_referral_code text;
  v_referred_users jsonb;
  v_signup_rewards integer := 0;
  v_blackcard_rewards integer := 0;
  v_total_referral_credits integer := 0;
  v_total_referred integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select p.referral_code
  into v_referral_code
  from public.profiles p
  where p.id = v_uid;

  select count(*)::integer
  into v_total_referred
  from public.profiles p
  where p.referred_by_user_id = v_uid;

  select coalesce(sum(t.amount), 0)::integer
  into v_total_referral_credits
  from public.crimson_credit_transactions t
  where t.user_id = v_uid
    and t.transaction_type in ('referral_signup', 'referral_blackcard')
    and t.amount > 0;

  select count(*)::integer
  into v_signup_rewards
  from public.crimson_credit_transactions t
  where t.user_id = v_uid
    and t.transaction_type = 'referral_signup'
    and t.amount > 0;

  select count(*)::integer
  into v_blackcard_rewards
  from public.crimson_credit_transactions t
  where t.user_id = v_uid
    and t.transaction_type = 'referral_blackcard'
    and t.amount > 0;

  select coalesce(
    jsonb_agg(entry order by entry->>'joined_at' desc nulls last),
    '[]'::jsonb
  )
  into v_referred_users
  from (
    select jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), '')),
      'signup_reward_awarded', exists (
        select 1
        from public.crimson_credit_transactions t
        where t.user_id = v_uid
          and t.transaction_type = 'referral_signup'
          and t.metadata ->> 'referred_user_id' = p.id::text
      ),
      'blackcard_reward_awarded', exists (
        select 1
        from public.crimson_credit_transactions t
        where t.user_id = v_uid
          and t.transaction_type = 'referral_blackcard'
          and t.metadata ->> 'referred_user_id' = p.id::text
      ),
      'joined_at', p.created_at
    ) as entry
    from public.profiles p
    where p.referred_by_user_id = v_uid
    order by p.created_at desc
    limit 100
  ) listed;

  return jsonb_build_object(
    'referral_code', v_referral_code,
    'total_referred', v_total_referred,
    'signup_rewards_earned', v_signup_rewards,
    'blackcard_rewards_earned', v_blackcard_rewards,
    'total_referral_credits_earned', v_total_referral_credits,
    'referred_users', coalesce(v_referred_users, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_own_referral_stats() from public;
grant execute on function public.get_own_referral_stats() to authenticated;
