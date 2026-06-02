-- Block self-join on Invite-only meets unless user is the host (bootstrap) or admin.

drop policy if exists "Users can join rides" on public.ride_attendees;

create policy "Users can join rides"
on public.ride_attendees
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.rides r
    where r.id = ride_id
      and r.status = 'active'
      and (
        coalesce(r.privacy, 'Open') = 'Open'
        or r.host_id = auth.uid()
        or public.is_profile_admin(auth.uid())
      )
  )
  and not exists (
    select 1
    from public.rides r
    where r.id = ride_id
      and public.users_are_blocked(auth.uid(), r.host_id)
  )
);

notify pgrst, 'reload schema';
