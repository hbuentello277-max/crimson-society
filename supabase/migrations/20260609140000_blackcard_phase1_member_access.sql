-- Phase 1: Blackcard member access (badge column, ride privacy, join RLS)

alter table public.profiles
  add column if not exists blackcard_public boolean not null default false;

create or replace function public.user_has_blackcard_access(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_profile_admin(coalesce(target_user_id, auth.uid()))
    or exists (
      select 1
      from public.subscriptions s
      where s.user_id = coalesce(target_user_id, auth.uid())
        and s.status in ('active', 'trialing')
        and (s.current_period_end is null or s.current_period_end >= now())
    );
$$;

revoke all on function public.user_has_blackcard_access(uuid) from public;
grant execute on function public.user_has_blackcard_access(uuid) to authenticated;

update public.profiles p
set blackcard_public = public.user_has_blackcard_access(p.id)
where p.blackcard_public is distinct from public.user_has_blackcard_access(p.id);

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
        or (
          coalesce(r.privacy, 'Open') = 'Blackcard'
          and public.user_has_blackcard_access(auth.uid())
        )
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
