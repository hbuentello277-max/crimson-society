create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  ride_id uuid references public.rides(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_reports_target_check check (reported_user_id is not null or ride_id is not null),
  constraint user_reports_reason_check check (char_length(trim(reason)) > 0 and char_length(reason) <= 120),
  constraint user_reports_details_check check (details is null or char_length(details) <= 2000),
  constraint user_reports_status_check check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  constraint user_reports_no_self_user_check check (reported_user_id is null or reporter_id <> reported_user_id)
);

alter table public.user_reports add column if not exists reporter_id uuid references auth.users(id) on delete cascade;
alter table public.user_reports add column if not exists reported_user_id uuid references auth.users(id) on delete set null;
alter table public.user_reports add column if not exists ride_id uuid references public.rides(id) on delete set null;
alter table public.user_reports add column if not exists reason text;
alter table public.user_reports add column if not exists details text;
alter table public.user_reports add column if not exists status text not null default 'pending';
alter table public.user_reports add column if not exists created_at timestamptz not null default now();
alter table public.user_reports add column if not exists updated_at timestamptz not null default now();

create index if not exists user_reports_reporter_created_idx
on public.user_reports (reporter_id, created_at desc);

create index if not exists user_reports_status_created_idx
on public.user_reports (status, created_at desc);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  details text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint account_deletion_requests_status_check check (status in ('pending', 'reviewing', 'completed', 'canceled')),
  constraint account_deletion_requests_details_check check (details is null or char_length(details) <= 2000)
);

alter table public.account_deletion_requests add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.account_deletion_requests add column if not exists status text not null default 'pending';
alter table public.account_deletion_requests add column if not exists details text;
alter table public.account_deletion_requests add column if not exists requested_at timestamptz not null default now();
alter table public.account_deletion_requests add column if not exists reviewed_at timestamptz;
alter table public.account_deletion_requests add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create unique index if not exists account_deletion_requests_one_open_per_user
on public.account_deletion_requests (user_id)
where status in ('pending', 'reviewing');

create index if not exists account_deletion_requests_status_requested_idx
on public.account_deletion_requests (status, requested_at desc);

alter table public.user_reports enable row level security;
alter table public.account_deletion_requests enable row level security;

drop policy if exists "Users can create their own reports" on public.user_reports;
create policy "Users can create their own reports"
on public.user_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and (reported_user_id is null or reported_user_id <> auth.uid())
  and status = 'pending'
);

drop policy if exists "Users can read their own reports" on public.user_reports;
create policy "Users can read their own reports"
on public.user_reports
for select
to authenticated
using (reporter_id = auth.uid() or public.is_profile_admin(auth.uid()));

drop policy if exists "Admins can update reports" on public.user_reports;
create policy "Admins can update reports"
on public.user_reports
for update
to authenticated
using (public.is_profile_admin(auth.uid()))
with check (public.is_profile_admin(auth.uid()));

drop policy if exists "Users can create their own account deletion request" on public.account_deletion_requests;
create policy "Users can create their own account deletion request"
on public.account_deletion_requests
for insert
to authenticated
with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "Users can read their own account deletion requests" on public.account_deletion_requests;
create policy "Users can read their own account deletion requests"
on public.account_deletion_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_profile_admin(auth.uid()));

drop policy if exists "Users can cancel their own pending account deletion request" on public.account_deletion_requests;
create policy "Users can cancel their own pending account deletion request"
on public.account_deletion_requests
for update
to authenticated
using (user_id = auth.uid() and status = 'pending')
with check (user_id = auth.uid() and status = 'canceled');

drop policy if exists "Admins can manage account deletion requests" on public.account_deletion_requests;
create policy "Admins can manage account deletion requests"
on public.account_deletion_requests
for all
to authenticated
using (public.is_profile_admin(auth.uid()))
with check (public.is_profile_admin(auth.uid()));

drop policy if exists "Members can send messages" on public.messages;
create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  auth.uid() = sender_id
  and public.is_conversation_member(conversation_id, auth.uid())
  and not exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id <> auth.uid()
      and public.users_are_blocked(auth.uid(), cm.user_id)
  )
);

drop policy if exists "Joined riders can send ride messages" on public.ride_messages;
create policy "Joined riders can send ride messages"
on public.ride_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
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

grant select, insert, update on public.user_reports to authenticated;
grant select, insert, update on public.account_deletion_requests to authenticated;
grant all on public.user_reports to service_role;
grant all on public.account_deletion_requests to service_role;
