create table if not exists public.ride_message_reads (
  ride_id uuid not null references public.rides(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);

alter table public.ride_message_reads enable row level security;

drop policy if exists "Users can read own ride message reads" on public.ride_message_reads;
drop policy if exists "Users can insert own ride message reads" on public.ride_message_reads;
drop policy if exists "Users can update own ride message reads" on public.ride_message_reads;
drop policy if exists "Users can delete own ride message reads" on public.ride_message_reads;

create policy "Users can read own ride message reads"
on public.ride_message_reads
for select
to authenticated
using (user_id = auth.uid());

create policy "Users can insert own ride message reads"
on public.ride_message_reads
for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own ride message reads"
on public.ride_message_reads
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users can delete own ride message reads"
on public.ride_message_reads
for delete
to authenticated
using (user_id = auth.uid());
