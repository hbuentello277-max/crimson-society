-- Trust & Safety launch hardening.
-- 1) Restore account deletion notification types.
-- 2) Gate protected writes to active accounts.
-- 3) Require conversation membership for message/conversation reports.
-- 4) Remove broad anon grants from safety tables while keeping intended actions.

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
    'meet_updated',
    'meet_ended',
    'direct_message',
    'new_conversation',
    'post_liked',
    'post_commented',
    'favorite_rider_meet',
    'favorite_rider_post',
    'favorite_rider_ride_started',
    'host_meet_created',
    'shop_order_paid',
    'shop_order_confirmed',
    'shop_order_ready',
    'shop_order_ready_for_pickup',
    'shop_order_shipped',
    'admin_report_submitted',
    'admin_order_placed',
    'account_deletion_requested',
    'account_deletion_canceled',
    'account_deletion_approved',
    'blackcard_announcement',
    'crimson_credits_reward',
    'event_announcement'
  )
);

drop policy if exists "Authenticated users can create posts" on public."Posts";
create policy "Authenticated users can create posts"
on public."Posts"
for insert
to authenticated
with check (
  auth.uid() = user_id
  and public.is_active_user(auth.uid())
);

drop policy if exists "Users can update their own posts" on public."Posts";
create policy "Users can update their own posts"
on public."Posts"
for update
to authenticated
using (
  auth.uid() = user_id
  and public.is_active_user(auth.uid())
)
with check (
  auth.uid() = user_id
  and public.is_active_user(auth.uid())
);

drop policy if exists "Users can delete their own posts" on public."Posts";
create policy "Users can delete their own posts"
on public."Posts"
for delete
to authenticated
using (
  auth.uid() = user_id
  and public.is_active_user(auth.uid())
);

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.is_active_user(auth.uid())
  and public.is_conversation_member(conversation_id, auth.uid())
  and not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id <> auth.uid()
      and public.users_are_blocked(auth.uid(), cm.user_id)
  )
);

drop policy if exists "Authenticated users can create rides" on public.rides;
create policy "Authenticated users can create rides"
on public.rides
for insert
to authenticated
with check (
  host_id = auth.uid()
  and public.is_active_user(auth.uid())
);

drop policy if exists "Hosts can update own rides" on public.rides;
create policy "Hosts can update own rides"
on public.rides
for update
to authenticated
using (
  host_id = auth.uid()
  and public.is_active_user(auth.uid())
)
with check (
  host_id = auth.uid()
  and public.is_active_user(auth.uid())
);

drop policy if exists "Admins can update rides" on public.rides;
create policy "Admins can update rides"
on public.rides
for update
to authenticated
using (public.is_profile_admin(auth.uid()))
with check (public.is_profile_admin(auth.uid()));

drop policy if exists "Users can join rides" on public.ride_attendees;
create policy "Users can join rides"
on public.ride_attendees
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_user(auth.uid())
  and exists (
    select 1
    from public.rides r
    where r.id = ride_attendees.ride_id
      and r.status = 'active'
      and (
        r.host_id = auth.uid()
        or public.is_profile_admin(auth.uid())
        or coalesce(
          r.visibility,
          case
            when coalesce(r.privacy, 'Open') = 'Invite' then 'invite'
            when coalesce(r.privacy, 'Open') = 'Blackcard' then 'blackcard'
            else 'public'
          end
        ) = 'public'
        or (
          coalesce(
            r.visibility,
            case
              when coalesce(r.privacy, 'Open') = 'Invite' then 'invite'
              when coalesce(r.privacy, 'Open') = 'Blackcard' then 'blackcard'
              else 'public'
            end
          ) = 'blackcard'
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
    where r.id = ride_attendees.ride_id
      and public.users_are_blocked(auth.uid(), r.host_id)
  )
);

drop policy if exists "Users can update own ride attendance" on public.ride_attendees;
create policy "Users can update own ride attendance"
on public.ride_attendees
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_user(auth.uid())
)
with check (
  user_id = auth.uid()
  and public.is_active_user(auth.uid())
);

drop policy if exists "Users can leave rides" on public.ride_attendees;
create policy "Users can leave rides"
on public.ride_attendees
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_user(auth.uid())
);

drop policy if exists "Hosts can remove meet riders" on public.ride_attendees;
create policy "Hosts can remove meet riders"
on public.ride_attendees
for delete
to authenticated
using (
  public.is_active_user(auth.uid())
  and user_id <> auth.uid()
  and exists (
    select 1
    from public.rides r
    where r.id = ride_attendees.ride_id
      and r.host_id = auth.uid()
      and r.status = 'active'
  )
);

drop policy if exists "Joined riders can send ride messages" on public.ride_messages;
create policy "Joined riders can send ride messages"
on public.ride_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_user(auth.uid())
  and kind = 'message'
  and (
    exists (
      select 1
      from public.ride_attendees ra
      where ra.ride_id = ride_messages.ride_id
        and ra.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.rides r
      where r.id = ride_messages.ride_id
        and r.host_id = auth.uid()
    )
  )
  and not exists (
    select 1
    from public.rides r
    where r.id = ride_messages.ride_id
      and public.users_are_blocked(auth.uid(), r.host_id)
  )
  and not exists (
    select 1
    from public.ride_attendees ra
    where ra.ride_id = ride_messages.ride_id
      and ra.user_id <> auth.uid()
      and public.users_are_blocked(auth.uid(), ra.user_id)
  )
);

drop policy if exists "Users can follow as themselves" on public.user_follows;
create policy "Users can follow as themselves"
on public.user_follows
for insert
to authenticated
with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
  and public.is_active_user(auth.uid())
  and not public.users_are_blocked(follower_id, following_id)
);

drop policy if exists "Users can unfollow as themselves" on public.user_follows;
create policy "Users can unfollow as themselves"
on public.user_follows
for delete
to authenticated
using (
  follower_id = auth.uid()
  and public.is_active_user(auth.uid())
);

drop policy if exists "Users can request connections" on public.user_connections;
create policy "Users can request connections"
on public.user_connections
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and requester_id <> addressee_id
  and public.is_active_user(auth.uid())
  and connection_key = public.connection_key_for(requester_id, addressee_id)
  and status = 'pending'
  and not public.users_are_blocked(requester_id, addressee_id)
);

drop policy if exists "Users can respond to connection requests" on public.user_connections;
create policy "Users can respond to connection requests"
on public.user_connections
for update
to authenticated
using (
  (auth.uid() = requester_id or auth.uid() = addressee_id)
  and public.is_active_user(auth.uid())
)
with check (
  public.is_active_user(auth.uid())
  and (
    auth.uid() = requester_id
    or (
      auth.uid() = addressee_id
      and status in ('accepted', 'declined')
      and not public.users_are_blocked(requester_id, addressee_id)
    )
  )
);

drop policy if exists "Users can cancel their own pending connection requests" on public.user_connections;
create policy "Users can cancel their own pending connection requests"
on public.user_connections
for delete
to authenticated
using (
  requester_id = auth.uid()
  and status = 'pending'
  and public.is_active_user(auth.uid())
);

drop policy if exists "Users can block others" on public.user_blocks;
create policy "Users can block others"
on public.user_blocks
for insert
to authenticated
with check (
  auth.uid() = blocker_id
  and blocker_id <> blocked_id
  and public.is_active_user(auth.uid())
);

drop policy if exists "Users can remove their own blocks" on public.user_blocks;
create policy "Users can remove their own blocks"
on public.user_blocks
for delete
to authenticated
using (
  auth.uid() = blocker_id
  and public.is_active_user(auth.uid())
);

drop policy if exists "Users can create their own reports" on public.user_reports;
create policy "Users can create their own reports"
on public.user_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and public.is_active_user(auth.uid())
  and status = 'pending'
  and (reported_user_id is null or reported_user_id <> auth.uid())
  and (
    post_id is null
    or not exists (
      select 1
      from public."Posts" p
      where p.id = user_reports.post_id
        and p.user_id = auth.uid()
    )
  )
  and (
    message_id is null
    or exists (
      select 1
      from public.messages m
      where m.id = user_reports.message_id
        and m.sender_id <> auth.uid()
        and public.is_conversation_member(m.conversation_id, auth.uid())
        and (
          user_reports.conversation_id is null
          or user_reports.conversation_id = m.conversation_id
        )
    )
  )
  and (
    conversation_id is null
    or public.is_conversation_member(conversation_id, auth.uid())
  )
  and (
    reported_user_id is not null
    or ride_id is not null
    or post_id is not null
    or message_id is not null
    or conversation_id is not null
  )
);

revoke all on public.user_reports from anon;
revoke all on public.user_reports from authenticated;
grant select, insert, update on public.user_reports to authenticated;
grant all on public.user_reports to service_role;

revoke all on public.user_blocks from anon;
revoke all on public.user_blocks from authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant all on public.user_blocks to service_role;

revoke all on public.account_deletion_requests from anon;
revoke all on public.account_deletion_requests from authenticated;
grant select, insert, update on public.account_deletion_requests to authenticated;
grant all on public.account_deletion_requests to service_role;

notify pgrst, 'reload schema';
