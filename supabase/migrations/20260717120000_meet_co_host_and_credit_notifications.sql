-- Co-host support, co-host meet permissions, and meet completion credit notifications.

alter table public.rides
  add column if not exists co_host_id uuid references public.profiles(id) on delete set null;

create index if not exists rides_co_host_id_idx on public.rides (co_host_id);

create or replace function public.is_ride_host_or_co_host(p_ride_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.rides r
    where r.id = p_ride_id
      and (
        r.host_id = p_user_id
        or r.co_host_id = p_user_id
      )
  );
$$;

revoke all on function public.is_ride_host_or_co_host(uuid, uuid) from public;
grant execute on function public.is_ride_host_or_co_host(uuid, uuid) to authenticated;

drop policy if exists "Co-hosts can update assigned rides" on public.rides;
create policy "Co-hosts can update assigned rides"
on public.rides
for update
to authenticated
using (
  co_host_id = auth.uid()
  and public.is_active_user(auth.uid())
)
with check (
  co_host_id = auth.uid()
  and public.is_active_user(auth.uid())
);

create or replace function public.notify_meet_credit_reward(
  p_user_id uuid,
  p_ride_id uuid,
  p_ride_name text,
  p_role text,
  p_amount integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
  v_meet_name text := coalesce(nullif(btrim(p_ride_name), ''), 'the meet');
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    return;
  end if;

  v_title := 'Crimson Credits earned';

  if p_role = 'cohost' then
    v_body := format('You earned %s Crimson Credits for co-hosting %s.', p_amount, v_meet_name);
  elsif p_role = 'host' then
    v_body := format('You earned %s Crimson Credits for hosting %s.', p_amount, v_meet_name);
  else
    v_body := format('You earned %s Crimson Credits for attending %s.', p_amount, v_meet_name);
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    ride_id,
    target_url
  )
  values (
    p_user_id,
    'crimson_credits_reward',
    v_title,
    v_body,
    p_ride_id,
    '/profile/credits/history'
  );
end;
$$;

revoke all on function public.notify_meet_credit_reward(uuid, uuid, text, text, integer) from public;

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
  v_settings jsonb := public.crimson_credits_economy_settings();
  v_host_amount integer;
  v_attend_amount integer;
  v_award jsonb;
  v_awarded integer;
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
    and (v_ride.co_host_id is null or ra.user_id <> v_ride.co_host_id)
    and ra.status = 'going';

  if v_other_attendee_count < 1 then
    return;
  end if;

  v_host_amount := greatest(0, coalesce((v_settings->>'host_meet_credits')::integer, 20));
  v_attend_amount := greatest(0, coalesce((v_settings->>'attend_meet_credits')::integer, 10));

  if coalesce((v_settings->>'earn_host_meet_enabled')::boolean, true) and v_host_amount > 0 then
    v_award := public.award_crimson_credits(
      v_ride.host_id,
      v_host_amount,
      'meet_hosted',
      'Hosted a completed meet',
      'meet_host:' || v_ride.host_id::text || ':' || v_ride.id::text,
      jsonb_build_object(
        'ride_id', v_ride.id,
        'meet_id', v_ride.id,
        'completed_at', v_ride.ended_at,
        'other_attendee_count', v_other_attendee_count
      )
    );

    v_awarded := coalesce((v_award->>'awarded')::integer, 0);
    if v_awarded > 0 and coalesce((v_award->>'duplicate')::boolean, false) = false then
      perform public.notify_meet_credit_reward(
        v_ride.host_id,
        v_ride.id,
        v_ride.name,
        'host',
        v_awarded
      );
    end if;
  end if;

  if v_ride.co_host_id is not null
     and coalesce((v_settings->>'earn_host_meet_enabled')::boolean, true)
     and v_host_amount > 0
     and exists (
       select 1
       from public.ride_attendees ra
       where ra.ride_id = v_ride.id
         and ra.user_id = v_ride.co_host_id
         and ra.status = 'going'
     ) then
    v_award := public.award_crimson_credits(
      v_ride.co_host_id,
      v_host_amount,
      'meet_hosted',
      'Co-hosted a completed meet',
      'meet_cohost:' || v_ride.co_host_id::text || ':' || v_ride.id::text,
      jsonb_build_object(
        'ride_id', v_ride.id,
        'meet_id', v_ride.id,
        'completed_at', v_ride.ended_at,
        'cohost', true
      )
    );

    v_awarded := coalesce((v_award->>'awarded')::integer, 0);
    if v_awarded > 0 and coalesce((v_award->>'duplicate')::boolean, false) = false then
      perform public.notify_meet_credit_reward(
        v_ride.co_host_id,
        v_ride.id,
        v_ride.name,
        'cohost',
        v_awarded
      );
    end if;
  end if;

  if coalesce((v_settings->>'earn_attend_meet_enabled')::boolean, true) and v_attend_amount > 0 then
    for v_attendee_user_id in
      select ra.user_id
      from public.ride_attendees ra
      where ra.ride_id = v_ride.id
        and ra.user_id <> v_ride.host_id
        and (v_ride.co_host_id is null or ra.user_id <> v_ride.co_host_id)
        and ra.status = 'going'
    loop
      v_award := public.award_crimson_credits(
        v_attendee_user_id,
        v_attend_amount,
        'meet_attended',
        'Attended a completed meet',
        'meet_attend:' || v_attendee_user_id::text || ':' || v_ride.id::text,
        jsonb_build_object(
          'ride_id', v_ride.id,
          'meet_id', v_ride.id,
          'completed_at', v_ride.ended_at
        )
      );

      v_awarded := coalesce((v_award->>'awarded')::integer, 0);
      if v_awarded > 0 and coalesce((v_award->>'duplicate')::boolean, false) = false then
        perform public.notify_meet_credit_reward(
          v_attendee_user_id,
          v_ride.id,
          v_ride.name,
          'attend',
          v_awarded
        );
      end if;
    end loop;
  end if;
exception
  when others then
    raise warning 'meet completion credits failed for ride %: %', p_ride_id, sqlerrm;
end;
$$;
