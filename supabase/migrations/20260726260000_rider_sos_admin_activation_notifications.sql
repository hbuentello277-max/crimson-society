-- Rider SOS beta readiness: staff receive an activation notification even
-- when the rider sends SOS without GPS. Nearby rider notifications still
-- require GPS on the SOS and a recent live rider location within 5 miles.

create or replace function public.notify_nearby_riders_for_sos_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient record;
  v_distance numeric;
  v_body text;
  v_admin_body text;
begin
  if new.status is distinct from 'active' then
    return new;
  end if;

  v_admin_body := public.rider_sos_type_label(new.sos_type)
    || ' · '
    || case
      when new.latitude is not null and new.longitude is not null then 'Location shared'
      else 'No GPS attached'
    end;

  for v_recipient in
    select p.id as user_id
    from public.profiles p
    where p.id is distinct from new.user_id
      and public.is_active_user(p.id)
      and (
        public.is_profile_admin(p.id)
        or public.is_platform_owner(p.id)
      )
  loop
    perform public.try_insert_rider_sos_notification(
      new.id,
      'sos_activated',
      v_recipient.user_id,
      '🚨 Rider SOS Activated',
      v_admin_body,
      new.user_id
    );
  end loop;

  -- Server-side nearby eligibility uses the latest actively shared meet live
  -- location for riders. Riders without a recent shared location cannot be
  -- safely proven inside the SOS radius and are not notified as nearby.
  if new.latitude is null or new.longitude is null then
    return new;
  end if;

  for v_recipient in
    with latest_locations as (
      select distinct on (ll.user_id)
        ll.user_id,
        ll.lat,
        ll.lng,
        ll.updated_at
      from public.ride_live_locations ll
      where ll.sharing_enabled = true
        and ll.updated_at >= now() - interval '30 minutes'
        and ll.user_id is distinct from new.user_id
      order by ll.user_id, ll.updated_at desc
    )
    select
      p.id as user_id,
      public.haversine_distance_miles(
        new.latitude,
        new.longitude,
        latest_locations.lat,
        latest_locations.lng
      ) as distance_miles
    from latest_locations
    inner join public.profiles p on p.id = latest_locations.user_id
    where public.is_active_user(p.id)
      and coalesce(p.push_notifications_enabled, true) = true
      and exists (
        select 1
        from public.user_push_tokens t
        where t.user_id = p.id
          and t.enabled = true
      )
      and not public.users_are_blocked(p.id, new.user_id)
      and public.haversine_distance_miles(
        new.latitude,
        new.longitude,
        latest_locations.lat,
        latest_locations.lng
      ) <= 5
  loop
    v_distance := v_recipient.distance_miles;
    v_body := public.rider_sos_type_label(new.sos_type)
      || ' · '
      || public.rider_sos_push_distance_label(v_distance);

    perform public.try_insert_rider_sos_notification(
      new.id,
      'sos_activated',
      v_recipient.user_id,
      '🚨 Rider Needs Assistance',
      v_body,
      new.user_id
    );
  end loop;

  return new;
end;
$$;

revoke all on function public.notify_nearby_riders_for_sos_activation() from public;

notify pgrst, 'reload schema';
