-- Award meet host/attend credits only when a meet completes with valid attendance.
-- Replaces immediate awards on rides/ride_attendees insert (farmable).

drop trigger if exists award_meet_host_credit_after_insert on public.rides;
drop trigger if exists award_meet_attend_credit_after_insert on public.ride_attendees;
drop function if exists public.trg_award_meet_host_credit();
drop function if exists public.trg_award_meet_attend_credit();

create or replace function public.try_award_meet_completion_credits(p_ride_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
  v_other_attendee_count integer := 0;
  v_min_duration constant interval := interval '5 minutes';
  v_attendee_user_id uuid;
begin
  select * into v_ride
  from public.rides r
  where r.id = p_ride_id;

  if not found then
    return;
  end if;

  if v_ride.tracking_status <> 'ended' then
    return;
  end if;

  if v_ride.status is distinct from 'active' then
    return;
  end if;

  if v_ride.started_at is null or v_ride.ended_at is null then
    return;
  end if;

  if v_ride.ended_at < v_ride.started_at + v_min_duration then
    return;
  end if;

  select count(*)::integer
  into v_other_attendee_count
  from public.ride_attendees ra
  where ra.ride_id = v_ride.id
    and ra.user_id <> v_ride.host_id
    and ra.status = 'going';

  if v_other_attendee_count < 1 then
    return;
  end if;

  perform public.award_crimson_credits(
    v_ride.host_id,
    20,
    'meet_hosted',
    'Hosted a completed meet',
    'meet_host:' || v_ride.host_id::text || ':' || v_ride.id::text,
    jsonb_build_object(
      'ride_id', v_ride.id,
      'completed_at', v_ride.ended_at,
      'other_attendee_count', v_other_attendee_count
    )
  );

  for v_attendee_user_id in
    select ra.user_id
    from public.ride_attendees ra
    where ra.ride_id = v_ride.id
      and ra.user_id <> v_ride.host_id
      and ra.status = 'going'
  loop
    perform public.award_crimson_credits(
      v_attendee_user_id,
      10,
      'meet_attended',
      'Attended a completed meet',
      'meet_attend:' || v_attendee_user_id::text || ':' || v_ride.id::text,
      jsonb_build_object('ride_id', v_ride.id, 'completed_at', v_ride.ended_at)
    );
  end loop;
exception
  when others then
    raise warning 'meet completion credits failed for ride %: %', p_ride_id, sqlerrm;
end;
$$;

revoke all on function public.try_award_meet_completion_credits(uuid) from public;

create or replace function public.trg_award_meet_completion_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tracking_status = 'ended'
     and old.tracking_status is distinct from 'ended' then
    perform public.try_award_meet_completion_credits(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists award_meet_completion_credits_after_tracking_end on public.rides;
create trigger award_meet_completion_credits_after_tracking_end
after update of tracking_status on public.rides
for each row
execute function public.trg_award_meet_completion_credits();
