-- Phase 6: public meet preview for shareable meet URLs.

create or replace function public.meet_preview_visibility(p_ride public.rides)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(p_ride.visibility), ''),
    case
      when coalesce(p_ride.privacy, 'Open') = 'Invite' then 'invite'
      when coalesce(p_ride.privacy, 'Open') = 'Blackcard' then 'blackcard'
      else 'public'
    end
  );
$$;

create or replace function public.can_view_meet_preview(
  p_ride public.rides,
  p_viewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when p_ride.status is distinct from 'active' then false
      when public.is_profile_admin(p_viewer_id) then true
      when p_viewer_id is not null and p_ride.host_id = p_viewer_id then true
      when p_viewer_id is not null and p_ride.co_host_id = p_viewer_id then true
      when p_viewer_id is not null and exists (
        select 1
        from public.ride_attendees ra
        where ra.ride_id = p_ride.id
          and ra.user_id = p_viewer_id
      ) then true
      when public.meet_preview_visibility(p_ride) = 'public' then true
      when p_viewer_id is null then false
      when public.meet_preview_visibility(p_ride) = 'invite' then false
      when public.meet_preview_visibility(p_ride) = 'blackcard'
        and public.user_has_blackcard_access(p_viewer_id) then true
      when public.meet_preview_visibility(p_ride) = 'followers'
        and public.user_follows_ride_host(p_viewer_id, p_ride.host_id) then true
      when public.meet_preview_visibility(p_ride) = 'favorites'
        and public.user_favorited_ride_host(p_viewer_id, p_ride.host_id) then true
      else false
    end;
$$;

create or replace function public.meet_preview_lock_message(p_visibility text)
returns text
language sql
immutable
as $$
  select case p_visibility
    when 'blackcard' then 'This meet is exclusive to Blackcard members.'
    when 'followers' then 'This meet is visible to followers of the host.'
    when 'favorites' then 'This meet is visible to riders who favorited the host.'
    when 'invite' then 'Invite-only meet. Ask the host to add you.'
    else 'This meet is not publicly available.'
  end;
$$;

create or replace function public.get_public_meet_preview(p_meet_id uuid)
returns table (
  id uuid,
  name text,
  date text,
  time text,
  meet_point text,
  destination text,
  city text,
  description text,
  cover text,
  distance text,
  duration text,
  meet_type text,
  host_name text,
  host_username text,
  rider_count integer,
  visibility text,
  status text,
  is_accessible boolean,
  can_open_in_app boolean,
  lock_message text,
  route jsonb,
  meet_point_lat numeric,
  meet_point_lng numeric,
  destination_lat numeric,
  destination_lng numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
  v_visibility text;
  v_viewer_id uuid := auth.uid();
  v_can_view boolean;
  v_host_name text;
  v_host_username text;
  v_rider_count integer := 0;
begin
  select *
  into v_ride
  from public.rides r
  where r.id = p_meet_id;

  if not found then
    return;
  end if;

  v_visibility := public.meet_preview_visibility(v_ride);
  v_can_view := public.can_view_meet_preview(v_ride, v_viewer_id);

  if not v_can_view then
    return query
    select
      v_ride.id,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      0::integer,
      v_visibility,
      coalesce(v_ride.status, 'active'),
      false,
      false,
      public.meet_preview_lock_message(v_visibility),
      null::jsonb,
      null::numeric,
      null::numeric,
      null::numeric,
      null::numeric;
    return;
  end if;

  select
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      nullif(trim(p.username), ''),
      'Crimson Rider'
    ),
    nullif(trim(p.username), '')
  into v_host_name, v_host_username
  from public.public_profiles p
  where p.id = v_ride.host_id;

  select count(*)::integer
  into v_rider_count
  from public.ride_attendees ra
  where ra.ride_id = v_ride.id;

  return query
  select
    v_ride.id,
    coalesce(nullif(trim(v_ride.name), ''), 'Untitled Meet'),
    coalesce(v_ride.date, ''),
    coalesce(v_ride.time, ''),
    coalesce(nullif(trim(v_ride.meet_point), ''), 'Meet point pending'),
    coalesce(nullif(trim(v_ride.destination), ''), 'Destination pending'),
    coalesce(nullif(trim(v_ride.city), ''), nullif(trim(v_ride.meet_point), ''), 'Location pending'),
    coalesce(v_ride.description, ''),
    coalesce(nullif(trim(v_ride.cover), ''), '/icon-512.png'),
    coalesce(nullif(trim(v_ride.distance), ''), 'TBD'),
    coalesce(nullif(trim(v_ride.duration), ''), 'TBD'),
    coalesce(nullif(trim(v_ride.type), ''), 'Group Ride'),
    coalesce(v_host_name, 'Crimson Rider'),
    v_host_username,
    v_rider_count,
    v_visibility,
    coalesce(v_ride.status, 'active'),
    true,
    v_viewer_id is not null,
    null::text,
    v_ride.route,
    v_ride.meet_point_lat,
    v_ride.meet_point_lng,
    v_ride.destination_lat,
    v_ride.destination_lng;
end;
$$;

revoke all on function public.meet_preview_visibility(public.rides) from public;
revoke all on function public.can_view_meet_preview(public.rides, uuid) from public;
revoke all on function public.meet_preview_lock_message(text) from public;
revoke all on function public.get_public_meet_preview(uuid) from public;

grant execute on function public.get_public_meet_preview(uuid) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
