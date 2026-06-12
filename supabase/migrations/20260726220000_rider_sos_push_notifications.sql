-- Rider SOS Phase 3C: server-side push notification queueing.
--
-- Push dispatch already runs from notifications -> push_notification_jobs.
-- This migration only creates SOS notification rows with deterministic
-- idempotency keys; no client component sends pushes directly.

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'meet_joined',
    'meet_left',
    'meet_chat_message',
    'meet_chat_photo',
    'profile_followed',
    'follow',
    'meet_removed',
    'meet_canceled',
    'meet_cancelled',
    'meet_updated',
    'meet_ended',
    'meet_reminder',
    'direct_message',
    'new_conversation',
    'connection_request',
    'connection_request_received',
    'connection_accepted',
    'post_liked',
    'post_like',
    'post_commented',
    'post_comment',
    'favorite_rider_meet',
    'favorite_rider_post',
    'favorite_rider_ride_started',
    'host_meet_created',
    'shop_order_paid',
    'shop_order_confirmed',
    'shop_order_ready',
    'shop_order_ready_for_pickup',
    'shop_order_shipped',
    'order_created',
    'order_confirmed',
    'order_preparing',
    'order_ready_to_ship',
    'order_shipped',
    'order_ready_for_pickup',
    'order_delivered',
    'order_completed',
    'admin_order_created',
    'admin_order_paid',
    'admin_order_placed',
    'admin_low_inventory',
    'admin_report_submitted',
    'account_deletion_requested',
    'account_deletion_canceled',
    'account_deletion_approved',
    'blackcard_announcement',
    'crimson_credits_reward',
    'event_announcement',
    'sos_activated',
    'sos_responded',
    'sos_arrived'
  )
);

create table if not exists public.rider_sos_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  sos_event_id uuid not null references public.rider_sos_events(id) on delete cascade,
  event_type text not null check (event_type in ('sos_activated', 'sos_responded', 'sos_arrived')),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (sos_event_id, event_type, recipient_user_id)
);

alter table public.rider_sos_notification_deliveries enable row level security;

drop policy if exists "Service role manages rider sos notification deliveries" on public.rider_sos_notification_deliveries;
create policy "Service role manages rider sos notification deliveries"
on public.rider_sos_notification_deliveries
for all
to service_role
using (true)
with check (true);

revoke all on public.rider_sos_notification_deliveries from anon, authenticated;
grant all on public.rider_sos_notification_deliveries to service_role;

create or replace function public.rider_sos_alert_path(p_alert_id uuid)
returns text
language sql
immutable
as $$
  select '/rider-sos/alerts/' || p_alert_id::text;
$$;

create or replace function public.rider_sos_type_label(p_sos_type text)
returns text
language sql
immutable
as $$
  select case p_sos_type
    when 'medical_emergency' then 'Medical Emergency'
    when 'crash' then 'Crash'
    when 'mechanical' then 'Mechanical Issue'
    when 'lost_separated' then 'Lost / Separated'
    when 'other' then 'Other'
    else coalesce(nullif(btrim(p_sos_type), ''), 'Rider SOS')
  end;
$$;

create or replace function public.rider_sos_push_distance_label(p_distance_miles numeric)
returns text
language sql
immutable
as $$
  select case
    when p_distance_miles is null then 'Distance unknown'
    else to_char(round(p_distance_miles::numeric, 1), 'FM999990.0') || ' miles away'
  end;
$$;

create or replace function public.rider_sos_notification_group_key(
  p_event_type text,
  p_sos_event_id uuid,
  p_recipient_user_id uuid
)
returns text
language sql
immutable
as $$
  select 'rider_sos:' || p_event_type || ':' || p_sos_event_id::text || ':' || p_recipient_user_id::text;
$$;

create or replace function public.try_insert_rider_sos_notification(
  p_sos_event_id uuid,
  p_event_type text,
  p_recipient_user_id uuid,
  p_title text,
  p_body text,
  p_actor_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery_id uuid;
  v_notification_id uuid;
  v_path text := public.rider_sos_alert_path(p_sos_event_id);
  v_group_key text := public.rider_sos_notification_group_key(p_event_type, p_sos_event_id, p_recipient_user_id);
begin
  if p_sos_event_id is null
     or p_recipient_user_id is null
     or p_event_type not in ('sos_activated', 'sos_responded', 'sos_arrived') then
    return null;
  end if;

  insert into public.rider_sos_notification_deliveries (
    sos_event_id,
    event_type,
    recipient_user_id
  )
  values (
    p_sos_event_id,
    p_event_type,
    p_recipient_user_id
  )
  on conflict (sos_event_id, event_type, recipient_user_id) do nothing
  returning id into v_delivery_id;

  if v_delivery_id is null then
    return null;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    actor_id,
    target_url,
    destination_url,
    metadata,
    notification_group_key,
    notification_count,
    last_actor_id,
    last_preview_text,
    last_event_at,
    created_at
  )
  values (
    p_recipient_user_id,
    p_event_type,
    p_title,
    p_body,
    p_actor_id,
    v_path,
    v_path,
    jsonb_build_object(
      'entity_type', 'rider_sos',
      'entity_id', p_sos_event_id,
      'sos_alert_id', p_sos_event_id,
      'route', v_path,
      'idempotency_key', v_group_key
    ),
    v_group_key,
    1,
    p_actor_id,
    p_body,
    now(),
    now()
  )
  on conflict (user_id, notification_group_key)
  where read_at is null and notification_group_key is not null
  do nothing
  returning id into v_notification_id;

  if v_notification_id is not null then
    update public.rider_sos_notification_deliveries
    set notification_id = v_notification_id
    where id = v_delivery_id;
  end if;

  return v_notification_id;
end;
$$;

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
begin
  if new.status is distinct from 'active' then
    return new;
  end if;

  -- Server-side nearby eligibility uses the latest actively shared meet live
  -- location for riders. Riders without a recent shared location cannot be
  -- safely proven inside the SOS radius and are not notified.
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

create or replace function public.notify_sos_owner_on_response_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_responder_name text;
  v_event_type text;
  v_title text;
  v_body text;
begin
  if new.status not in ('responding', 'arrived') then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  select e.user_id
  into v_owner_id
  from public.rider_sos_events e
  where e.id = new.sos_event_id
    and e.status = 'active';

  if v_owner_id is null or v_owner_id = new.responder_user_id then
    return new;
  end if;

  v_responder_name := coalesce(public.notification_actor_name(new.responder_user_id), 'A rider');

  if new.status = 'arrived' then
    v_event_type := 'sos_arrived';
    v_title := '✅ Help Arrived';
    v_body := v_responder_name || ' marked arrived';
  else
    v_event_type := 'sos_responded';
    v_title := '🚨 Help Is Responding';
    v_body := v_responder_name || ' is responding to your SOS';
  end if;

  perform public.try_insert_rider_sos_notification(
    new.sos_event_id,
    v_event_type,
    v_owner_id,
    v_title,
    v_body,
    new.responder_user_id
  );

  return new;
end;
$$;

drop trigger if exists notify_nearby_riders_for_sos_activation on public.rider_sos_events;
create trigger notify_nearby_riders_for_sos_activation
after insert on public.rider_sos_events
for each row execute function public.notify_nearby_riders_for_sos_activation();

drop trigger if exists notify_sos_owner_on_response_status on public.rider_sos_responses;
create trigger notify_sos_owner_on_response_status
after insert or update of status on public.rider_sos_responses
for each row execute function public.notify_sos_owner_on_response_status();

revoke all on function public.rider_sos_alert_path(uuid) from public;
revoke all on function public.rider_sos_type_label(text) from public;
revoke all on function public.rider_sos_push_distance_label(numeric) from public;
revoke all on function public.rider_sos_notification_group_key(text, uuid, uuid) from public;
revoke all on function public.try_insert_rider_sos_notification(uuid, text, uuid, text, text, uuid) from public;
revoke all on function public.notify_nearby_riders_for_sos_activation() from public;
revoke all on function public.notify_sos_owner_on_response_status() from public;

grant execute on function public.rider_sos_alert_path(uuid) to authenticated, service_role;
grant execute on function public.rider_sos_type_label(text) to authenticated, service_role;
grant execute on function public.rider_sos_push_distance_label(numeric) to authenticated, service_role;
grant execute on function public.rider_sos_notification_group_key(text, uuid, uuid) to authenticated, service_role;
grant execute on function public.try_insert_rider_sos_notification(uuid, text, uuid, text, text, uuid) to service_role;

notify pgrst, 'reload schema';

