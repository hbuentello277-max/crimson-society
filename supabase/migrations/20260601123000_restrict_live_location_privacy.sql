drop policy if exists "Ride viewers can read live locations" on public.ride_live_locations;

create policy "Ride viewers can read live locations"
on public.ride_live_locations
for select
to authenticated
using (
  sharing_enabled = true
  and updated_at >= now() - interval '30 minutes'
  and (
    ride_live_locations.user_id = auth.uid()
    or (
      not public.users_are_blocked(auth.uid(), ride_live_locations.user_id)
      and exists (
        select 1
        from public.rides r
        where r.id = ride_live_locations.ride_id
          and r.status = 'active'
          and r.tracking_status = 'active'
          and (
            r.host_id = auth.uid()
            or exists (
              select 1
              from public.ride_attendees ra
              where ra.ride_id = r.id
                and ra.user_id = auth.uid()
            )
            or exists (
              select 1
              from public.user_follows viewer_to_owner
              join public.user_follows owner_to_viewer
                on owner_to_viewer.follower_id = ride_live_locations.user_id
                and owner_to_viewer.following_id = auth.uid()
              where viewer_to_owner.follower_id = auth.uid()
                and viewer_to_owner.following_id = ride_live_locations.user_id
            )
          )
      )
    )
  )
);
