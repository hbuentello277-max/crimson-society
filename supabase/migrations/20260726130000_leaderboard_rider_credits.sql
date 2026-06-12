-- Expose Crimson Credits balance on founding leaderboard entries for rider preview sheets.

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
      coalesce(cc.credits_balance, 0)::integer as credits_balance,
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
    left join public.crimson_credits cc on cc.user_id = p.id
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
          'credits_balance', l.credits_balance,
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

  select coalesce(max((entry->>'points')::integer), 0)
  into v_cutoff_points
  from jsonb_array_elements(v_entries) entry
  where (entry->>'rank')::integer = v_top_n;

  return jsonb_build_object(
    'entries', v_entries,
    'current_user', coalesce(v_current, '{}'::jsonb),
    'top_n', v_top_n,
    'cutoff_points', v_cutoff_points,
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
