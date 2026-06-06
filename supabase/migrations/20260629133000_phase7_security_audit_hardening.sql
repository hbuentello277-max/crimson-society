-- Phase 7 security audit hardening.
-- Locks inventory reservations, removes raw profile broad-read access,
-- makes DM media private, and closes remaining suspended-account write gaps.

-- 1) Product inventory reservations must be service-role/server only.
alter table public.product_inventory_reservations enable row level security;

revoke all on table public.product_inventory_reservations from anon;
revoke all on table public.product_inventory_reservations from authenticated;
grant all on table public.product_inventory_reservations to service_role;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_inventory_reservations'
  loop
    execute format(
      'drop policy if exists %I on public.product_inventory_reservations',
      pol.policyname
    );
  end loop;
end $$;

-- 2) Raw profiles table is owner/admin only. Public profile reads use public.public_profiles.
drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Profiles: authenticated can read discoverable profiles" on public.profiles;
drop policy if exists "Profiles: conversation members can read participant profiles" on public.profiles;
drop policy if exists "Profiles: admins can read all profiles" on public.profiles;

create policy "Profiles: admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_profile_admin(auth.uid()));

drop policy if exists "Profiles: users can update own profile" on public.profiles;
create policy "Profiles: active users can update own profile"
on public.profiles
for update
to authenticated
using ((auth.uid() = id) and public.is_active_user(auth.uid()))
with check ((auth.uid() = id) and public.is_active_user(auth.uid()));

create or replace view public.public_profiles
with (security_invoker = false) as
select
  id,
  username,
  display_name,
  full_name,
  avatar_url,
  profile_image_url,
  bio,
  case when hide_location_from_suggestions then null else location end as location,
  case when hide_location_from_suggestions then null else city end as city,
  case when hide_location_from_suggestions then null else state end as state,
  riding_area,
  bike_type,
  riding_style,
  profile_tags,
  hide_location_from_suggestions,
  hide_from_suggestions,
  quote,
  instagram_url,
  tiktok_url,
  youtube_url,
  website_url,
  blackcard_public,
  is_founding_blackcard,
  founding_blackcard_granted_at,
  membership_tier
from public.profiles
where status = 'active';

grant select on public.public_profiles to anon;
grant select on public.public_profiles to authenticated;

-- 3) Message media is private. Existing and future access must go through signed URLs.
update storage.buckets
set public = false
where id = 'message-media';

drop policy if exists "Message media public read" on storage.objects;

drop policy if exists "Conversation members upload message media" on storage.objects;
create policy "Conversation members upload message media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'message-media'
  and public.is_active_user(auth.uid())
  and public.is_conversation_member(public.message_media_conversation_id(name), auth.uid())
);

drop policy if exists "Conversation members update message media" on storage.objects;
create policy "Conversation members update message media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'message-media'
  and public.is_active_user(auth.uid())
  and public.is_conversation_member(public.message_media_conversation_id(name), auth.uid())
)
with check (
  bucket_id = 'message-media'
  and public.is_active_user(auth.uid())
  and public.is_conversation_member(public.message_media_conversation_id(name), auth.uid())
);

drop policy if exists "Conversation members delete message media" on storage.objects;
create policy "Conversation members delete message media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'message-media'
  and public.is_active_user(auth.uid())
  and public.is_conversation_member(public.message_media_conversation_id(name), auth.uid())
);

-- 4) Suspended/restricted accounts cannot create conversations or mutate social content.
drop policy if exists "Users can create conversations" on public.conversations;
create policy "Active users can create conversations"
on public.conversations
for insert
to authenticated
with check ((created_by = auth.uid()) and public.is_active_user(auth.uid()));

drop policy if exists "Conversation members can update conversations" on public.conversations;
create policy "Active conversation members can update conversations"
on public.conversations
for update
to authenticated
using (public.is_active_user(auth.uid()) and ((created_by = auth.uid()) or public.is_conversation_member(id, auth.uid())))
with check (public.is_active_user(auth.uid()) and ((created_by = auth.uid()) or public.is_conversation_member(id, auth.uid())));

drop policy if exists "Members can update conversation metadata" on public.conversations;

drop policy if exists "Users can join conversations they create" on public.conversation_members;
create policy "Active users can join conversations they create"
on public.conversation_members
for insert
to authenticated
with check (
  public.is_active_user(auth.uid())
  and (
    auth.uid() = user_id
    or exists (
      select 1
      from public.conversations c
      where c.id = conversation_members.conversation_id
        and c.created_by = auth.uid()
        and public.is_active_user(c.created_by)
        and not public.users_are_blocked(auth.uid(), conversation_members.user_id)
    )
  )
);

drop policy if exists "Users can update their conversation membership" on public.conversation_members;
drop policy if exists "Users can update their own membership" on public.conversation_members;
create policy "Active users can update their own conversation membership"
on public.conversation_members
for update
to authenticated
using ((user_id = auth.uid()) and public.is_active_user(auth.uid()))
with check ((user_id = auth.uid()) and public.is_active_user(auth.uid()));

drop policy if exists "users can insert their own posts" on public.posts;
create policy "active users can insert their own posts"
on public.posts
for insert
to authenticated
with check ((auth.uid() = user_id) and public.is_active_user(auth.uid()));

drop policy if exists "users can update their own posts" on public.posts;
create policy "active users can update their own posts"
on public.posts
for update
to authenticated
using ((auth.uid() = user_id) and public.is_active_user(auth.uid()))
with check ((auth.uid() = user_id) and public.is_active_user(auth.uid()));

drop policy if exists "users can delete their own posts" on public.posts;
create policy "active users can delete their own posts"
on public.posts
for delete
to authenticated
using ((auth.uid() = user_id) and public.is_active_user(auth.uid()));

drop policy if exists "Users can like posts" on public.post_likes;
drop policy if exists "users can like posts as themselves" on public.post_likes;
create policy "active users can like posts as themselves"
on public.post_likes
for insert
to authenticated
with check ((auth.uid() = user_id) and public.is_active_user(auth.uid()));

drop policy if exists "Users can unlike own likes" on public.post_likes;
drop policy if exists "users can remove their own likes" on public.post_likes;
create policy "active users can remove their own likes"
on public.post_likes
for delete
to authenticated
using ((auth.uid() = user_id) and public.is_active_user(auth.uid()));

drop policy if exists "Users can comment on posts" on public.post_comments;
drop policy if exists "users can add their own comments" on public.post_comments;
create policy "active users can add their own comments"
on public.post_comments
for insert
to authenticated
with check ((auth.uid() = user_id) and public.is_active_user(auth.uid()));

drop policy if exists "users can update their own comments" on public.post_comments;
create policy "active users can update their own comments"
on public.post_comments
for update
to authenticated
using ((auth.uid() = user_id) and public.is_active_user(auth.uid()))
with check ((auth.uid() = user_id) and public.is_active_user(auth.uid()));

drop policy if exists "Users can delete own comments" on public.post_comments;
drop policy if exists "users can delete their own comments" on public.post_comments;
create policy "active users can delete their own comments"
on public.post_comments
for delete
to authenticated
using ((auth.uid() = user_id) and public.is_active_user(auth.uid()));

drop policy if exists "Users can insert own live location" on public.ride_live_locations;
create policy "Users can insert own live location"
on public.ride_live_locations
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_user(auth.uid())
  and exists (
    select 1 from public.rides r
    where r.id = ride_live_locations.ride_id
      and r.status = 'active'
      and r.tracking_status = 'active'
      and (
        r.host_id = auth.uid()
        or exists (
          select 1 from public.ride_attendees ra
          where ra.ride_id = r.id and ra.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Users can update own live location" on public.ride_live_locations;
create policy "Users can update own live location"
on public.ride_live_locations
for update
to authenticated
using ((user_id = auth.uid()) and public.is_active_user(auth.uid()))
with check (
  user_id = auth.uid()
  and public.is_active_user(auth.uid())
  and exists (
    select 1 from public.rides r
    where r.id = ride_live_locations.ride_id
      and r.status = 'active'
      and r.tracking_status = 'active'
      and (
        r.host_id = auth.uid()
        or exists (
          select 1 from public.ride_attendees ra
          where ra.ride_id = r.id and ra.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Users can delete own live location" on public.ride_live_locations;
create policy "Users can delete own live location"
on public.ride_live_locations
for delete
to authenticated
using ((user_id = auth.uid()) and public.is_active_user(auth.uid()));

-- Storage write policies should require active accounts and owner-scoped paths.
drop policy if exists "Authenticated users can upload media" on storage.objects;
create policy "Active users can upload their own media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own media" on storage.objects;
create policy "Active users can update their own media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own media" on storage.objects;
create policy "Active users can delete their own media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and public.is_active_user(auth.uid())
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Harden Blackcard/credits helpers so restricted users cannot redeem via direct RPC.
create or replace function public.resolve_profile_membership_tier(target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_active_user(target_user_id) then 'free'
    when exists (
      select 1
      from public.profiles p
      where p.id = target_user_id
        and p.is_founding_blackcard = true
    ) then 'founding'
    when public.is_profile_admin(target_user_id)
      or public.profile_has_admin_blackcard_override(target_user_id)
      or exists (
        select 1
        from public.subscriptions s
        where s.user_id = target_user_id
          and s.status in ('active', 'trialing')
          and (s.current_period_end is null or s.current_period_end >= now())
      ) then 'blackcard'
    else 'free'
  end;
$$;

create or replace function public.user_has_blackcard_access(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_active_user(coalesce(target_user_id, auth.uid()))
    and (
      public.is_profile_admin(coalesce(target_user_id, auth.uid()))
      or exists (
        select 1
        from public.profiles p
        where p.id = coalesce(target_user_id, auth.uid())
          and p.is_founding_blackcard = true
      )
      or public.profile_has_admin_blackcard_override(coalesce(target_user_id, auth.uid()))
      or exists (
        select 1
        from public.subscriptions s
        where s.user_id = coalesce(target_user_id, auth.uid())
          and s.status in ('active', 'trialing')
          and (s.current_period_end is null or s.current_period_end >= now())
      )
    );
$$;

grant execute on function public.resolve_profile_membership_tier(uuid) to authenticated;
grant execute on function public.user_has_blackcard_access(uuid) to authenticated;
