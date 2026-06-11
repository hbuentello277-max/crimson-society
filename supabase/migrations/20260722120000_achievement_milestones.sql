-- Achievement milestone credits (one-time awards, idempotent via metadata keys).

create or replace function public.count_user_attended_meets(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct r.id)::integer
  from public.ride_attendees ra
  join public.rides r on r.id = ra.ride_id
  where ra.user_id = p_user_id
    and ra.status = 'going'
    and ra.user_id <> r.host_id
    and (r.co_host_id is null or ra.user_id <> r.co_host_id)
    and public.is_scoring_eligible_completed_meet(r.id);
$$;

create or replace function public.count_user_hosted_meets(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct r.id)::integer
  from public.rides r
  where public.is_scoring_eligible_completed_meet(r.id)
    and (r.host_id = p_user_id or r.co_host_id = p_user_id);
$$;

create or replace function public.count_user_referrals(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles ref
  where ref.referred_by_user_id = p_user_id;
$$;

create or replace function public.count_user_blackcard_conversions(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles ref
  where ref.referred_by_user_id = p_user_id
    and public.user_has_blackcard_access(ref.id);
$$;

create or replace function public.achievement_milestone_awarded(
  p_user_id uuid,
  p_idempotency_key text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crimson_credit_transactions t
    where t.user_id = p_user_id
      and t.metadata ->> 'idempotency_key' = p_idempotency_key
  );
$$;

create or replace function public.try_award_single_achievement_milestone(
  p_user_id uuid,
  p_category text,
  p_threshold integer,
  p_amount integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text;
  v_award jsonb;
begin
  if p_user_id is null or p_threshold <= 0 or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;

  v_key := 'achievement:' || p_category || ':' || p_threshold::text || ':' || p_user_id::text;

  if public.achievement_milestone_awarded(p_user_id, v_key) then
    return jsonb_build_object('ok', true, 'duplicate', true, 'idempotency_key', v_key);
  end if;

  v_award := public.award_crimson_credits(
    p_user_id,
    p_amount,
    'achievement_milestone',
    p_reason,
    v_key,
    jsonb_build_object(
      'source', 'achievement_milestone',
      'category', p_category,
      'threshold', p_threshold,
      'idempotency_key', v_key
    )
  );

  return jsonb_build_object(
    'ok', true,
    'duplicate', coalesce((v_award->>'duplicate')::boolean, false),
    'awarded', coalesce((v_award->>'awarded')::integer, 0),
    'idempotency_key', v_key,
    'reason', p_reason
  );
end;
$$;

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

revoke all on function public.count_user_attended_meets(uuid) from public;
revoke all on function public.count_user_hosted_meets(uuid) from public;
revoke all on function public.count_user_referrals(uuid) from public;
revoke all on function public.count_user_blackcard_conversions(uuid) from public;
revoke all on function public.achievement_milestone_awarded(uuid, text) from public;
revoke all on function public.try_award_single_achievement_milestone(uuid, text, integer, integer, text) from public;
revoke all on function public.try_award_achievement_milestones(uuid) from public;

grant execute on function public.count_user_attended_meets(uuid) to authenticated, service_role;
grant execute on function public.count_user_hosted_meets(uuid) to authenticated, service_role;
grant execute on function public.count_user_referrals(uuid) to authenticated, service_role;
grant execute on function public.count_user_blackcard_conversions(uuid) to authenticated, service_role;
grant execute on function public.achievement_milestone_awarded(uuid, text) to authenticated, service_role;
grant execute on function public.try_award_single_achievement_milestone(uuid, text, integer, integer, text) to service_role;
grant execute on function public.try_award_achievement_milestones(uuid) to authenticated;
