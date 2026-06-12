-- Rider SOS Phase 2: active SOS events (private; admins read active only).

create table if not exists public.rider_sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sos_type text not null,
  status text not null default 'active',
  latitude numeric,
  longitude numeric,
  location_accuracy numeric,
  bike_info text,
  emergency_contact_name text,
  emergency_contact_phone text,
  medical_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint rider_sos_events_sos_type_check check (
    sos_type in ('medical_emergency', 'crash', 'mechanical', 'lost_separated', 'other')
  ),
  constraint rider_sos_events_status_check check (
    status in ('active', 'resolved', 'cancelled')
  )
);

create index if not exists rider_sos_events_user_created_idx
  on public.rider_sos_events (user_id, created_at desc);

create index if not exists rider_sos_events_active_created_idx
  on public.rider_sos_events (created_at desc)
  where status = 'active';

create unique index if not exists rider_sos_events_one_active_per_user
  on public.rider_sos_events (user_id)
  where status = 'active';

alter table public.rider_sos_events enable row level security;

drop policy if exists "Users insert own rider sos events" on public.rider_sos_events;
create policy "Users insert own rider sos events"
on public.rider_sos_events
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users read own rider sos events" on public.rider_sos_events;
create policy "Users read own rider sos events"
on public.rider_sos_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users update own rider sos events" on public.rider_sos_events;
create policy "Users update own rider sos events"
on public.rider_sos_events
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins read active rider sos events" on public.rider_sos_events;
create policy "Admins read active rider sos events"
on public.rider_sos_events
for select
to authenticated
using (
  status = 'active'
  and (
    public.is_profile_admin(auth.uid())
    or public.is_platform_owner(auth.uid())
  )
);

revoke all on public.rider_sos_events from anon;
grant select, insert, update on public.rider_sos_events to authenticated;
grant all on public.rider_sos_events to service_role;
