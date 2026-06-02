-- Meet host moderation: RLS for host/admin controls and lifecycle notifications.

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'meet_joined',
    'meet_left',
    'meet_chat_message',
    'meet_chat_photo',
    'profile_followed',
    'meet_removed',
    'meet_canceled',
    'meet_ended'
  )
);

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
  )
  and not exists (
    select 1
    from public.rides r
    where r.id = ride_id
      and public.users_are_blocked(auth.uid(), r.host_id)
  )
);

drop policy if exists "Hosts can remove meet riders" on public.ride_attendees;
create policy "Hosts can remove meet riders"
on public.ride_attendees
for delete
to authenticated
using (
  user_id <> auth.uid()
  and exists (
    select 1
    from public.rides r
    where r.id = ride_attendees.ride_id
      and r.host_id = auth.uid()
      and r.status = 'active'
  )
);

drop policy if exists "Admins can remove meet riders" on public.ride_attendees;
create policy "Admins can remove meet riders"
on public.ride_attendees
for delete
to authenticated
using (
  public.is_profile_admin(auth.uid())
  and user_id <> auth.uid()
  and not exists (
    select 1
    from public.rides r
    where r.id = ride_attendees.ride_id
      and r.host_id = ride_attendees.user_id
  )
);

drop policy if exists "Admins can update rides" on public.rides;
create policy "Admins can update rides"
on public.rides
for update
to authenticated
using (public.is_profile_admin(auth.uid()))
with check (public.is_profile_admin(auth.uid()));

create or replace function public.disable_ride_live_location_for_user(
  target_ride_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ride_live_locations
  set sharing_enabled = false,
      updated_at = now()
  where ride_id = target_ride_id
    and user_id = target_user_id
    and sharing_enabled = true;
end;
$$;

revoke all on function public.disable_ride_live_location_for_user(uuid, uuid) from public;
grant execute on function public.disable_ride_live_location_for_user(uuid, uuid) to authenticated;

create or replace function public.create_ride_attendance_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ride_host_id uuid;
  ride_name text;
  actor_name text;
  target_ride_id uuid;
  target_user_id uuid;
  notification_type text;
  notification_title text;
  notification_body text;
begin
  if tg_op = 'INSERT' then
    target_ride_id := new.ride_id;
    target_user_id := new.user_id;
    notification_type := 'meet_joined';
    notification_title := 'Rider joined your meet';
  else
    target_ride_id := old.ride_id;
    target_user_id := old.user_id;
  end if;

  select r.host_id, r.name
  into ride_host_id, ride_name
  from public.rides r
  where r.id = target_ride_id;

  if ride_host_id is null then
    if tg_op = 'INSERT' then
      return new;
    end if;
    return old;
  end if;

  if tg_op = 'DELETE' then
    if target_user_id = ride_host_id then
      return old;
    end if;

    perform public.disable_ride_live_location_for_user(target_ride_id, target_user_id);

    if auth.uid() = target_user_id then
      notification_type := 'meet_left';
      notification_title := 'Rider left your meet';
      actor_name := coalesce(public.notification_actor_name(target_user_id), 'Crimson Member');
      notification_body := actor_name || ' left ' || coalesce(ride_name, 'your meet') || '.';

      insert into public.notifications (
        user_id,
        type,
        title,
        body,
        ride_id,
        actor_id
      )
      values (
        ride_host_id,
        notification_type,
        notification_title,
        notification_body,
        target_ride_id,
        target_user_id
      );

      return old;
    end if;

    if auth.uid() = ride_host_id or public.is_profile_admin(auth.uid()) then
      actor_name := coalesce(public.notification_actor_name(auth.uid()), 'Meet host');
      notification_body := 'You were removed from ' || coalesce(ride_name, 'a meet') || '.';

      insert into public.notifications (
        user_id,
        type,
        title,
        body,
        ride_id,
        actor_id
      )
      values (
        target_user_id,
        'meet_removed',
        'Removed from meet',
        notification_body,
        target_ride_id,
        auth.uid()
      );
    end if;

    return old;
  end if;

  if target_user_id = ride_host_id then
    return new;
  end if;

  if public.users_are_blocked(target_user_id, ride_host_id) then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(target_user_id), 'Crimson Member');
  notification_body := actor_name || ' joined ' || coalesce(ride_name, 'your meet') || '.';

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    ride_id,
    actor_id
  )
  values (
    ride_host_id,
    notification_type,
    notification_title,
    notification_body,
    target_ride_id,
    target_user_id
  );

  return new;
end;
$$;

create or replace function public.notify_ride_lifecycle_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ride_label text;
begin
  ride_label := coalesce(new.name, 'your meet');

  if old.status = 'active' and new.status = 'canceled' then
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      ride_id,
      actor_id
    )
    select
      ra.user_id,
      'meet_canceled',
      'Meet canceled',
      ride_label || ' was canceled by the host.',
      new.id,
      new.host_id
    from public.ride_attendees ra
    where ra.ride_id = new.id
      and ra.user_id <> new.host_id;

    update public.ride_live_locations
    set sharing_enabled = false,
        updated_at = now()
    where ride_id = new.id
      and sharing_enabled = true;

    return new;
  end if;

  if old.tracking_status = 'active'
    and new.tracking_status = 'ended'
    and new.status = 'active' then
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      ride_id,
      actor_id
    )
    select
      ra.user_id,
      'meet_ended',
      'Ride ended',
      ride_label || ' tracking has ended.',
      new.id,
      new.host_id
    from public.ride_attendees ra
    where ra.ride_id = new.id
      and ra.user_id <> new.host_id;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_ride_lifecycle_change on public.rides;
create trigger notify_ride_lifecycle_change
after update of status, tracking_status on public.rides
for each row
execute function public.notify_ride_lifecycle_change();
