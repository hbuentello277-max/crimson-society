-- Growth & onboarding: rider checklist credits, founding blackcard leaderboard.

-- ---------------------------------------------------------------------------
-- Economy: rider onboarding reward (+100 credits once)
-- ---------------------------------------------------------------------------
update public.platform_settings
set value = coalesce(value, '{}'::jsonb) || jsonb_build_object(
  'rider_onboarding_credits', 100,
  'earn_rider_onboarding_enabled', true
)
where key = 'crimson_credits_economy';

create or replace function public.crimson_credits_economy_settings()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_raw jsonb;
  v_defaults jsonb := jsonb_build_object(
    'attend_meet_credits', 10,
    'host_meet_credits', 20,
    'referral_signup_credits', 25,
    'referral_blackcard_credits', 50,
    'rider_onboarding_credits', 100,
    'monthly_earn_cap', 500,
    'credits_per_100_usd', 5,
    'blackcard_merch_discount_percent', 10,
    'earn_attend_meet_enabled', true,
    'earn_host_meet_enabled', true,
    'earn_referral_signup_enabled', true,
    'earn_referral_blackcard_enabled', true,
    'earn_rider_onboarding_enabled', true
  );
begin
  select value
  into v_raw
  from public.platform_settings
  where key = 'crimson_credits_economy';

  return v_defaults || coalesce(v_raw, '{}'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Completed meet helper (matches meet credit eligibility)
-- ---------------------------------------------------------------------------
create or replace function public.is_scoring_eligible_completed_meet(p_ride_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
  v_other_attendee_count integer := 0;
  v_min_duration constant interval := interval '5 minutes';
begin
  select * into v_ride
  from public.rides r
  where r.id = p_ride_id;

  if not found then
    return false;
  end if;

  if v_ride.tracking_status <> 'ended' then
    return false;
  end if;

  if v_ride.status is distinct from 'active' then
    return false;
  end if;

  if v_ride.started_at is null or v_ride.ended_at is null then
    return false;
  end if;

  if v_ride.ended_at < v_ride.started_at + v_min_duration then
    return false;
  end if;

  select count(*)::integer
  into v_other_attendee_count
  from public.ride_attendees ra
  where ra.ride_id = v_ride.id
    and ra.user_id <> v_ride.host_id
    and (v_ride.co_host_id is null or ra.user_id <> v_ride.co_host_id)
    and ra.status = 'going';

  return v_other_attendee_count >= 1;
end;
$$;

revoke all on function public.is_scoring_eligible_completed_meet(uuid) from public;
grant execute on function public.is_scoring_eligible_completed_meet(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Rider onboarding status + one-time credit award
-- ---------------------------------------------------------------------------
create or replace function public.get_rider_onboarding_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_ride_count integer := 0;
  v_profile_complete boolean := false;
  v_ride_added boolean := false;
  v_credits_awarded boolean := false;
  v_reward_amount integer;
  v_settings jsonb := public.crimson_credits_economy_settings();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_uid;

  if not found then
    raise exception 'Profile not found';
  end if;

  v_profile_complete :=
    coalesce(btrim(v_profile.username), '') <> ''
    and coalesce(btrim(v_profile.display_name), '') <> '';

  select count(*)::integer
  into v_ride_count
  from public.motorcycles m
  where m.user_id = v_uid;

  v_ride_added := v_ride_count > 0;

  select exists (
    select 1
    from public.crimson_credit_transactions t
    where t.user_id = v_uid
      and t.transaction_type = 'rider_onboarding'
      and t.amount > 0
  )
  into v_credits_awarded;

  v_reward_amount := greatest(0, coalesce((v_settings->>'rider_onboarding_credits')::integer, 100));

  return jsonb_build_object(
    'profile_complete', v_profile_complete,
    'ride_added', v_ride_added,
    'progress_percent', (
      (case when v_profile_complete then 50 else 0 end)
      + (case when v_ride_added then 50 else 0 end)
    ),
    'onboarding_complete', v_profile_complete and v_ride_added,
    'credits_awarded', v_credits_awarded,
    'reward_amount', v_reward_amount
  );
end;
$$;

revoke all on function public.get_rider_onboarding_status() from public;
grant execute on function public.get_rider_onboarding_status() to authenticated;

create or replace function public.try_award_rider_onboarding_credits()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status jsonb;
  v_settings jsonb := public.crimson_credits_economy_settings();
  v_amount integer;
  v_award jsonb;
  v_idempotency_key text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_status := public.get_rider_onboarding_status();

  if coalesce((v_status->>'onboarding_complete')::boolean, false) = false then
    return jsonb_build_object(
      'ok', false,
      'reason', 'incomplete',
      'status', v_status
    );
  end if;

  if coalesce((v_status->>'credits_awarded')::boolean, false) = true then
    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'status', v_status
    );
  end if;

  if not coalesce((v_settings->>'earn_rider_onboarding_enabled')::boolean, true) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'earning_disabled',
      'status', v_status
    );
  end if;

  v_amount := greatest(0, coalesce((v_settings->>'rider_onboarding_credits')::integer, 100));

  if v_amount <= 0 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'zero_credit_amount',
      'status', v_status
    );
  end if;

  v_idempotency_key := 'rider_onboarding:' || v_uid::text;

  v_award := public.award_crimson_credits(
    v_uid,
    v_amount,
    'rider_onboarding',
    'New rider onboarding complete',
    v_idempotency_key,
    jsonb_build_object('source', 'rider_onboarding_checklist')
  );

  v_status := public.get_rider_onboarding_status();

  return jsonb_build_object(
    'ok', true,
    'award', v_award,
    'status', v_status
  );
end;
$$;

revoke all on function public.try_award_rider_onboarding_credits() from public;
grant execute on function public.try_award_rider_onboarding_credits() to authenticated;

-- ---------------------------------------------------------------------------
-- Founding Blackcard leaderboard
-- ---------------------------------------------------------------------------
create or replace function public.get_founding_blackcard_leaderboard(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_top_n constant integer := 15;
  v_safe_limit integer := greatest(15, least(coalesce(p_limit, 50), 100));
  v_entries jsonb;
  v_current jsonb;
  v_cutoff_points integer := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  with scored as (
    select
      p.id as user_id,
      p.username,
      coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), '')) as display_name,
      coalesce(p.profile_image_url, p.avatar_url) as avatar_url,
      (
        case
          when coalesce(btrim(p.username), '') <> ''
            and coalesce(btrim(p.display_name), '') <> ''
          then 100
          else 0
        end
        + coalesce(attend.count, 0) * 10
        + coalesce(hosted.count, 0) * 20
        + coalesce(referrals.total, 0) * 25
        + coalesce(referrals.blackcard, 0) * 50
      )::integer as points,
      (
        case
          when coalesce(btrim(p.username), '') <> ''
            and coalesce(btrim(p.display_name), '') <> ''
          then 100
          else 0
        end
      )::integer as profile_points,
      coalesce(attend.count, 0) * 10 as attend_points,
      coalesce(hosted.count, 0) * 20 as host_points,
      coalesce(referrals.total, 0) * 25 as referral_signup_points,
      coalesce(referrals.blackcard, 0) * 50 as referral_blackcard_points
    from public.profiles p
    left join lateral (
      select count(distinct r.id)::integer as count
      from public.ride_attendees ra
      join public.rides r on r.id = ra.ride_id
      where ra.user_id = p.id
        and ra.status = 'going'
        and ra.user_id <> r.host_id
        and (r.co_host_id is null or ra.user_id <> r.co_host_id)
        and public.is_scoring_eligible_completed_meet(r.id)
    ) attend on true
    left join lateral (
      select count(distinct r.id)::integer as count
      from public.rides r
      where public.is_scoring_eligible_completed_meet(r.id)
        and (r.host_id = p.id or r.co_host_id = p.id)
    ) hosted on true
    left join lateral (
      select
        count(*)::integer as total,
        count(*) filter (
          where public.user_has_blackcard_access(ref.id)
        )::integer as blackcard
      from public.profiles ref
      where ref.referred_by_user_id = p.id
    ) referrals on true
    where coalesce(p.status, 'active') = 'active'
  ),
  ranked as (
    select
      s.*,
      rank() over (order by s.points desc, s.user_id asc) as rank
    from scored s
    where s.points > 0
  ),
  limited as (
    select *
    from ranked
    order by rank asc
    limit v_safe_limit
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'rank', l.rank,
          'user_id', l.user_id,
          'username', l.username,
          'display_name', l.display_name,
          'avatar_url', l.avatar_url,
          'points', l.points,
          'profile_points', l.profile_points,
          'attend_points', l.attend_points,
          'host_points', l.host_points,
          'referral_signup_points', l.referral_signup_points,
          'referral_blackcard_points', l.referral_blackcard_points,
          'is_current_user', l.user_id = v_uid,
          'in_top_15', l.rank <= v_top_n
        )
        order by l.rank asc
      ),
      '[]'::jsonb
    )
  into v_entries
  from limited l;

  select jsonb_build_object(
    'rank', r.rank,
    'points', r.points,
    'in_top_15', r.rank <= v_top_n,
    'profile_points', r.profile_points,
    'attend_points', r.attend_points,
    'host_points', r.host_points,
    'referral_signup_points', r.referral_signup_points,
    'referral_blackcard_points', r.referral_blackcard_points
  )
  into v_current
  from (
    select
      s.*,
      rank() over (order by s.points desc, s.user_id asc) as rank
    from (
      select
        p.id as user_id,
        (
          case
            when coalesce(btrim(p.username), '') <> ''
              and coalesce(btrim(p.display_name), '') <> ''
            then 100
            else 0
          end
          + coalesce(attend.count, 0) * 10
          + coalesce(hosted.count, 0) * 20
          + coalesce(referrals.total, 0) * 25
          + coalesce(referrals.blackcard, 0) * 50
        )::integer as points,
        (
          case
            when coalesce(btrim(p.username), '') <> ''
              and coalesce(btrim(p.display_name), '') <> ''
            then 100
            else 0
          end
        )::integer as profile_points,
        coalesce(attend.count, 0) * 10 as attend_points,
        coalesce(hosted.count, 0) * 20 as host_points,
        coalesce(referrals.total, 0) * 25 as referral_signup_points,
        coalesce(referrals.blackcard, 0) * 50 as referral_blackcard_points
      from public.profiles p
      left join lateral (
        select count(distinct r.id)::integer as count
        from public.ride_attendees ra
        join public.rides r on r.id = ra.ride_id
        where ra.user_id = p.id
          and ra.status = 'going'
          and ra.user_id <> r.host_id
          and (r.co_host_id is null or ra.user_id <> r.co_host_id)
          and public.is_scoring_eligible_completed_meet(r.id)
      ) attend on true
      left join lateral (
        select count(distinct r.id)::integer as count
        from public.rides r
        where public.is_scoring_eligible_completed_meet(r.id)
          and (r.host_id = p.id or r.co_host_id = p.id)
      ) hosted on true
      left join lateral (
        select
          count(*)::integer as total,
          count(*) filter (
            where public.user_has_blackcard_access(ref.id)
          )::integer as blackcard
        from public.profiles ref
        where ref.referred_by_user_id = p.id
      ) referrals on true
      where p.id = v_uid
    ) s
  ) r;

  select coalesce(points, 0)
  into v_cutoff_points
  from (
    select
      s.points,
      rank() over (order by s.points desc, s.user_id asc) as rank
    from (
      select
        p.id as user_id,
        (
          case
            when coalesce(btrim(p.username), '') <> ''
              and coalesce(btrim(p.display_name), '') <> ''
            then 100
            else 0
          end
          + coalesce(attend.count, 0) * 10
          + coalesce(hosted.count, 0) * 20
          + coalesce(referrals.total, 0) * 25
          + coalesce(referrals.blackcard, 0) * 50
        )::integer as points
      from public.profiles p
      left join lateral (
        select count(distinct r.id)::integer as count
        from public.ride_attendees ra
        join public.rides r on r.id = ra.ride_id
        where ra.user_id = p.id
          and ra.status = 'going'
          and ra.user_id <> r.host_id
          and (r.co_host_id is null or ra.user_id <> r.co_host_id)
          and public.is_scoring_eligible_completed_meet(r.id)
      ) attend on true
      left join lateral (
        select count(distinct r.id)::integer as count
        from public.rides r
        where public.is_scoring_eligible_completed_meet(r.id)
          and (r.host_id = p.id or r.co_host_id = p.id)
      ) hosted on true
      left join lateral (
        select
          count(*)::integer as total,
          count(*) filter (
            where public.user_has_blackcard_access(ref.id)
          )::integer as blackcard
        from public.profiles ref
        where ref.referred_by_user_id = p.id
      ) referrals on true
      where coalesce(p.status, 'active') = 'active'
    ) s
    where s.points > 0
  ) ranked
  where rank = v_top_n;

  return jsonb_build_object(
    'entries', coalesce(v_entries, '[]'::jsonb),
    'current_user', coalesce(v_current, jsonb_build_object(
      'rank', null,
      'points', 0,
      'in_top_15', false
    )),
    'top_n', v_top_n,
    'cutoff_points', coalesce(v_cutoff_points, 0),
    'scoring', jsonb_build_object(
      'profile_complete', 100,
      'attend_meet', 10,
      'host_meet', 20,
      'referral_signup', 25,
      'referral_blackcard', 50
    )
  );
end;
$$;

revoke all on function public.get_founding_blackcard_leaderboard(integer) from public;
grant execute on function public.get_founding_blackcard_leaderboard(integer) to authenticated;

notify pgrst, 'reload schema';
