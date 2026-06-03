-- Social action menus, favorites, saved/hidden posts, mutes, Blackcard Phase 2 meet perks.

-- Admin-granted Blackcard override (works alongside Stripe subscriptions)
alter table public.profiles
  add column if not exists is_premium boolean not null default false,
  add column if not exists premium_tier text,
  add column if not exists premium_since timestamptz,
  add column if not exists premium_expires_at timestamptz;

-- ---------------------------------------------------------------------------
-- Favorite riders
-- ---------------------------------------------------------------------------
create table if not exists public.favorite_riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  favorite_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favorite_riders_no_self check (user_id <> favorite_user_id),
  constraint favorite_riders_unique unique (user_id, favorite_user_id)
);

create index if not exists favorite_riders_user_idx
  on public.favorite_riders (user_id, created_at desc);

alter table public.favorite_riders enable row level security;

drop policy if exists "Users can read own favorite riders" on public.favorite_riders;
create policy "Users can read own favorite riders"
on public.favorite_riders for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can favorite riders" on public.favorite_riders;
create policy "Users can favorite riders"
on public.favorite_riders for insert to authenticated
with check (user_id = auth.uid() and favorite_user_id <> auth.uid());

drop policy if exists "Users can unfavorite riders" on public.favorite_riders;
create policy "Users can unfavorite riders"
on public.favorite_riders for delete to authenticated
using (user_id = auth.uid());

grant select, insert, delete on public.favorite_riders to authenticated;
grant all on public.favorite_riders to service_role;

-- ---------------------------------------------------------------------------
-- Saved + hidden posts
-- ---------------------------------------------------------------------------
create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public."Posts"(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_posts_unique unique (user_id, post_id)
);

create table if not exists public.hidden_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public."Posts"(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint hidden_posts_unique unique (user_id, post_id)
);

alter table public.saved_posts enable row level security;
alter table public.hidden_posts enable row level security;

drop policy if exists "Users manage own saved posts" on public.saved_posts;
create policy "Users manage own saved posts"
on public.saved_posts for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users manage own hidden posts" on public.hidden_posts;
create policy "Users manage own hidden posts"
on public.hidden_posts for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, delete on public.saved_posts to authenticated;
grant select, insert, delete on public.hidden_posts to authenticated;

-- ---------------------------------------------------------------------------
-- Rider mutes (posts + ride invites)
-- ---------------------------------------------------------------------------
create table if not exists public.rider_mutes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  mute_posts boolean not null default true,
  mute_invites boolean not null default false,
  created_at timestamptz not null default now(),
  constraint rider_mutes_no_self check (user_id <> muted_user_id),
  constraint rider_mutes_unique unique (user_id, muted_user_id)
);

alter table public.rider_mutes enable row level security;

drop policy if exists "Users manage own rider mutes" on public.rider_mutes;
create policy "Users manage own rider mutes"
on public.rider_mutes for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.rider_mutes to authenticated;

-- ---------------------------------------------------------------------------
-- Host meet notification subscriptions (Blackcard perk)
-- ---------------------------------------------------------------------------
create table if not exists public.ride_notification_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint ride_notification_subscriptions_no_self check (subscriber_id <> host_id),
  constraint ride_notification_subscriptions_unique unique (subscriber_id, host_id)
);

alter table public.ride_notification_subscriptions enable row level security;

drop policy if exists "Users manage own meet subscriptions" on public.ride_notification_subscriptions;
create policy "Users manage own meet subscriptions"
on public.ride_notification_subscriptions for all to authenticated
using (subscriber_id = auth.uid()) with check (subscriber_id = auth.uid());

grant select, insert, delete on public.ride_notification_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Posts: pin to profile
-- ---------------------------------------------------------------------------
alter table public."Posts" add column if not exists pinned_at timestamptz;

-- ---------------------------------------------------------------------------
-- Rides: visibility + priority access (Blackcard perks)
-- ---------------------------------------------------------------------------
alter table public.rides add column if not exists visibility text not null default 'public';
alter table public.rides add column if not exists priority_access text not null default 'off';
alter table public.rides add column if not exists priority_open_at timestamptz;

alter table public.rides drop constraint if exists rides_visibility_check;
alter table public.rides add constraint rides_visibility_check
  check (visibility in ('public', 'followers', 'favorites', 'blackcard', 'invite'));

alter table public.rides drop constraint if exists rides_priority_access_check;
alter table public.rides add constraint rides_priority_access_check
  check (priority_access in ('off', 'blackcard_first'));

-- Backfill visibility from legacy privacy column
update public.rides
set visibility = case
  when privacy = 'Invite' then 'invite'
  else 'public'
end
where visibility is null or visibility = 'public';

-- ---------------------------------------------------------------------------
-- Notification types: favorites + host subscriptions + prior deep-link types
-- ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'meet_joined', 'meet_left', 'meet_chat_message', 'meet_chat_photo',
    'profile_followed', 'meet_removed', 'meet_canceled', 'meet_ended',
    'direct_message', 'post_liked', 'post_commented',
    'account_deletion_requested', 'account_deletion_canceled', 'account_deletion_approved',
    'favorite_rider_meet', 'favorite_rider_post', 'favorite_rider_ride_started',
    'host_meet_created'
  )
);

alter table public.notifications
  add column if not exists post_id uuid references public."Posts"(id) on delete cascade,
  add column if not exists comment_id uuid references public.post_comments(id) on delete cascade,
  add column if not exists deletion_request_id uuid references public.account_deletion_requests(id) on delete cascade,
  add column if not exists target_url text;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Phase 1 signature MUST be preserved (default auth.uid()). Postgres rejects removing defaults via CREATE OR REPLACE.
create or replace function public.profile_has_admin_blackcard_override(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.is_premium = true
      and lower(coalesce(p.premium_tier, '')) = 'blackcard'
      and (p.premium_expires_at is null or p.premium_expires_at >= now())
  );
$$;

revoke all on function public.profile_has_admin_blackcard_override(uuid) from public;
grant execute on function public.profile_has_admin_blackcard_override(uuid) to authenticated;

create or replace function public.user_has_blackcard_access(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_profile_admin(coalesce(target_user_id, auth.uid()))
    or public.profile_has_admin_blackcard_override(coalesce(target_user_id, auth.uid()))
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

create or replace function public.sync_profile_blackcard_public(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_value boolean;
begin
  next_value := public.user_has_blackcard_access(target_user_id);

  update public.profiles p
  set blackcard_public = next_value
  where p.id = target_user_id
    and p.blackcard_public is distinct from next_value;

  return next_value;
end;
$$;

revoke all on function public.sync_profile_blackcard_public(uuid) from public;
grant execute on function public.sync_profile_blackcard_public(uuid) to authenticated;

update public.profiles p
set blackcard_public = public.user_has_blackcard_access(p.id)
where p.blackcard_public is distinct from public.user_has_blackcard_access(p.id);

create or replace function public.notify_favorite_riders(
  p_actor_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_ride_id uuid default null,
  p_post_id uuid default null,
  p_target_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fav record;
begin
  if p_type not in ('favorite_rider_meet', 'favorite_rider_post', 'favorite_rider_ride_started') then
    raise exception 'Invalid favorite rider notification type.';
  end if;

  for fav in
    select fr.user_id
    from public.favorite_riders fr
    where fr.favorite_user_id = p_actor_user_id
      and fr.user_id <> p_actor_user_id
      and not public.users_are_blocked(fr.user_id, p_actor_user_id)
  loop
    if not exists (
      select 1 from public.notifications n
      where n.user_id = fav.user_id
        and n.type = p_type
        and n.actor_id = p_actor_user_id
        and coalesce(n.ride_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_ride_id, '00000000-0000-0000-0000-000000000000'::uuid)
        and coalesce(n.post_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_post_id, '00000000-0000-0000-0000-000000000000'::uuid)
        and n.created_at >= now() - interval '5 minutes'
    ) then
      insert into public.notifications (user_id, type, title, body, actor_id, ride_id, post_id, target_url)
      values (fav.user_id, p_type, p_title, p_body, p_actor_user_id, p_ride_id, p_post_id, p_target_url);
    end if;
  end loop;
end;
$$;

create or replace function public.notify_host_meet_subscribers(
  p_host_id uuid,
  p_ride_id uuid,
  p_ride_name text,
  p_target_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sub record;
  host_name text;
begin
  host_name := coalesce(public.notification_actor_name(p_host_id), 'A rider');

  for sub in
    select rns.subscriber_id
    from public.ride_notification_subscriptions rns
    where rns.host_id = p_host_id
      and rns.subscriber_id <> p_host_id
      and not public.users_are_blocked(rns.subscriber_id, p_host_id)
  loop
    insert into public.notifications (user_id, type, title, body, actor_id, ride_id, target_url)
    values (
      sub.subscriber_id,
      'host_meet_created',
      'New meet from a host you follow',
      host_name || ' created ' || coalesce(p_ride_name, 'a new meet') || '.',
      p_host_id,
      p_ride_id,
      p_target_url
    );
  end loop;
end;
$$;

create or replace function public.create_favorite_rider_post_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  actor_name := coalesce(public.notification_actor_name(new.user_id), 'A favorite rider');
  perform public.notify_favorite_riders(
    new.user_id,
    'favorite_rider_post',
    'Favorite rider posted',
    actor_name || ' just shared a new post.',
    null,
    new.id,
    '/dashboard?post=' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists create_favorite_rider_post_notification_after_insert on public."Posts";
create trigger create_favorite_rider_post_notification_after_insert
after insert on public."Posts"
for each row
execute function public.create_favorite_rider_post_notification();

create or replace function public.create_favorite_rider_meet_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
  destination text;
begin
  destination := '/rides?meet=' || new.id::text;
  actor_name := coalesce(public.notification_actor_name(new.host_id), 'A favorite rider');

  perform public.notify_favorite_riders(
    new.host_id,
    'favorite_rider_meet',
    'Favorite rider created a meet',
    actor_name || ' just created a new meet.',
    new.id,
    null,
    destination
  );

  perform public.notify_host_meet_subscribers(
    new.host_id,
    new.id,
    new.name,
    destination
  );

  return new;
end;
$$;

drop trigger if exists create_favorite_rider_meet_notification_after_insert on public.rides;
create trigger create_favorite_rider_meet_notification_after_insert
after insert on public.rides
for each row
execute function public.create_favorite_rider_meet_notification();

create or replace function public.create_favorite_rider_ride_started_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if new.tracking_status is distinct from 'active' or old.tracking_status = 'active' then
    return new;
  end if;

  actor_name := coalesce(public.notification_actor_name(new.host_id), 'A favorite rider');
  perform public.notify_favorite_riders(
    new.host_id,
    'favorite_rider_ride_started',
    'Favorite rider started a ride',
    actor_name || ' just started ride tracking.',
    new.id,
    null,
    '/rides?meet=' || new.id::text || '&section=chat'
  );
  return new;
end;
$$;

drop trigger if exists create_favorite_rider_ride_started_after_update on public.rides;
create trigger create_favorite_rider_ride_started_after_update
after update of tracking_status on public.rides
for each row
execute function public.create_favorite_rider_ride_started_notification();

-- Meet join RLS respects visibility + Blackcard access (Stripe OR admin override)
create or replace function public.user_follows_ride_host(viewer_id uuid, host_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_follows uf
    where uf.follower_id = viewer_id
      and uf.following_id = host_id
  );
$$;

create or replace function public.user_favorited_ride_host(viewer_id uuid, host_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.favorite_riders fr
    where fr.user_id = viewer_id
      and fr.favorite_user_id = host_id
  );
$$;

revoke all on function public.user_follows_ride_host(uuid, uuid) from public;
grant execute on function public.user_follows_ride_host(uuid, uuid) to authenticated;
revoke all on function public.user_favorited_ride_host(uuid, uuid) from public;
grant execute on function public.user_favorited_ride_host(uuid, uuid) to authenticated;

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
        r.host_id = auth.uid()
        or public.is_profile_admin(auth.uid())
        or coalesce(r.visibility, case
          when coalesce(r.privacy, 'Open') = 'Invite' then 'invite'
          when coalesce(r.privacy, 'Open') = 'Blackcard' then 'blackcard'
          else 'public'
        end) = 'public'
        or (
          coalesce(r.visibility, case
            when coalesce(r.privacy, 'Open') = 'Invite' then 'invite'
            when coalesce(r.privacy, 'Open') = 'Blackcard' then 'blackcard'
            else 'public'
          end) = 'blackcard'
          and public.user_has_blackcard_access(auth.uid())
        )
        or (
          coalesce(r.visibility, 'public') = 'followers'
          and public.user_follows_ride_host(auth.uid(), r.host_id)
        )
        or (
          coalesce(r.visibility, 'public') = 'favorites'
          and public.user_favorited_ride_host(auth.uid(), r.host_id)
        )
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

-- Admin read access for platform stats
drop policy if exists "Admins read all favorite riders" on public.favorite_riders;
create policy "Admins read all favorite riders"
on public.favorite_riders for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Admins read all meet subscriptions" on public.ride_notification_subscriptions;
create policy "Admins read all meet subscriptions"
on public.ride_notification_subscriptions for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
