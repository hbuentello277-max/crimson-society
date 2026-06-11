-- Performance Phase 2: safe indexes and database-side badge/unread aggregates.

-- ─── Indexes ────────────────────────────────────────────────────────────────

create index if not exists posts_created_at_desc_idx
  on public."Posts" (created_at desc);

create index if not exists posts_user_id_created_at_desc_idx
  on public."Posts" (user_id, created_at desc);

-- messages_conversation_created_idx already exists from messages foundation.

create index if not exists notifications_user_read_at_idx
  on public.notifications (user_id, read_at);

-- notifications_user_created_idx and notifications_user_unread_idx already exist.

create index if not exists ride_messages_ride_created_at_desc_idx
  on public.ride_messages (ride_id, created_at desc);

create index if not exists ride_message_reads_user_ride_idx
  on public.ride_message_reads (user_id, ride_id);

create index if not exists ride_attendees_user_status_ride_idx
  on public.ride_attendees (user_id, status, ride_id);

create index if not exists ride_attendees_ride_status_idx
  on public.ride_attendees (ride_id, status);

create index if not exists rides_status_date_time_idx
  on public.rides (status, date, time);

create index if not exists rides_host_id_date_idx
  on public.rides (host_id, date);

create index if not exists rides_co_host_id_date_idx
  on public.rides (co_host_id, date);

create index if not exists products_product_type_status_sort_idx
  on public.products (product_type, status, sort_order);

create index if not exists post_comments_post_id_created_at_desc_idx
  on public.post_comments (post_id, created_at desc);

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.meet_lifecycle_is_upcoming_or_active(
  p_status text,
  p_date text,
  p_time text,
  p_now timestamptz default now()
)
returns boolean
language sql
stable
as $$
  select
    coalesce(p_status, 'active') <> 'canceled'
    and p_date is not null
    and btrim(p_date) <> ''
    and (
      p_now < (
        btrim(p_date) || 'T' || coalesce(nullif(btrim(p_time), ''), '00:00')
      )::timestamptz
      or (
        p_now >= (
          btrim(p_date) || 'T' || coalesce(nullif(btrim(p_time), ''), '00:00')
        )::timestamptz
        and p_now <= (btrim(p_date) || 'T23:59:59.999')::timestamptz
      )
    );
$$;

create or replace function public.user_can_read_ride_messages(
  p_ride_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is not null
    and (
      exists (
        select 1
        from public.ride_attendees ra
        where ra.ride_id = p_ride_id
          and ra.user_id = p_user_id
      )
      or exists (
        select 1
        from public.rides r
        where r.id = p_ride_id
          and r.host_id = p_user_id
      )
    );
$$;

-- ─── Nav badge counts ───────────────────────────────────────────────────────

create or replace function public.get_nav_badge_counts()
returns table (
  unread_messages_count bigint,
  unread_notifications_count bigint,
  unread_meet_chat_count bigint,
  total_badge_count bigint
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_user_id uuid := auth.uid();
  v_messages bigint := 0;
  v_notifications bigint := 0;
  v_meet_chat bigint := 0;
begin
  if v_user_id is null then
    return query
    select 0::bigint, 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  select count(*)::bigint
  into v_notifications
  from public.notifications n
  where n.user_id = v_user_id
    and n.read_at is null;

  select count(*)::bigint
  into v_messages
  from public.messages m
  inner join public.conversation_members cm
    on cm.conversation_id = m.conversation_id
   and cm.user_id = v_user_id
  where m.sender_id <> v_user_id
    and (cm.last_read_at is null or m.created_at > cm.last_read_at)
    and not exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = v_user_id and ub.blocked_id = m.sender_id)
         or (ub.blocked_id = v_user_id and ub.blocker_id = m.sender_id)
    );

  select count(*)::bigint
  into v_meet_chat
  from public.ride_messages rm
  inner join public.rides r
    on r.id = rm.ride_id
  left join public.ride_message_reads rmr
    on rmr.ride_id = rm.ride_id
   and rmr.user_id = v_user_id
  where r.status = 'active'
    and public.meet_lifecycle_is_upcoming_or_active(r.status, r.date::text, r.time::text)
    and rm.user_id <> v_user_id
    and (rmr.last_read_at is null or rm.created_at > rmr.last_read_at)
    and public.user_can_read_ride_messages(r.id, v_user_id);

  return query
  select
    v_messages,
    v_notifications,
    v_meet_chat,
    (v_messages + v_notifications + v_meet_chat)::bigint;
end;
$$;

-- ─── Meet chat unread counts (per ride) ─────────────────────────────────────

create or replace function public.get_meet_chat_unread_counts(p_ride_ids uuid[] default null)
returns table (
  ride_id uuid,
  unread_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with viewer as (
    select auth.uid() as user_id
  ),
  target_rides as (
    select r.id
    from public.rides r
    cross join viewer v
    where v.user_id is not null
      and r.status = 'active'
      and public.meet_lifecycle_is_upcoming_or_active(r.status, r.date::text, r.time::text)
      and (p_ride_ids is null or r.id = any (p_ride_ids))
      and public.user_can_read_ride_messages(r.id, v.user_id)
  )
  select
    tr.id as ride_id,
    count(rm.id) filter (
      where rm.user_id <> v.user_id
        and (rmr.last_read_at is null or rm.created_at > rmr.last_read_at)
    )::bigint as unread_count
  from target_rides tr
  cross join viewer v
  left join public.ride_messages rm
    on rm.ride_id = tr.id
  left join public.ride_message_reads rmr
    on rmr.ride_id = tr.id
   and rmr.user_id = v.user_id
  group by tr.id, v.user_id;
$$;

revoke all on function public.meet_lifecycle_is_upcoming_or_active(text, text, text, timestamptz) from public;
revoke all on function public.user_can_read_ride_messages(uuid, uuid) from public;

grant execute on function public.get_nav_badge_counts() to authenticated;
grant execute on function public.get_meet_chat_unread_counts(uuid[]) to authenticated;
