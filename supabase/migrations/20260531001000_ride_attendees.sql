create table if not exists public.ride_attendees (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going',
  created_at timestamptz not null default now(),
  unique (ride_id, user_id)
);

alter table public.ride_attendees enable row level security;

drop policy if exists "Users can read ride attendees" on public.ride_attendees;
drop policy if exists "Users can join rides" on public.ride_attendees;
drop policy if exists "Users can update own ride attendance" on public.ride_attendees;
drop policy if exists "Users can leave rides" on public.ride_attendees;

create policy "Users can read ride attendees"
on public.ride_attendees
for select
to authenticated
using (true);

create policy "Users can join rides"
on public.ride_attendees
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own ride attendance"
on public.ride_attendees
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can leave rides"
on public.ride_attendees
for delete
to authenticated
using (user_id = auth.uid());
