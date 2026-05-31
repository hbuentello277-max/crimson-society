create table if not exists public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

alter table public.ride_messages enable row level security;

drop policy if exists "Joined riders can read ride messages" on public.ride_messages;
drop policy if exists "Joined riders can send ride messages" on public.ride_messages;
drop policy if exists "Users can delete own ride messages" on public.ride_messages;

create policy "Joined riders can read ride messages"
on public.ride_messages
for select
to authenticated
using (
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
);

create policy "Joined riders can send ride messages"
on public.ride_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
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
);

create policy "Users can delete own ride messages"
on public.ride_messages
for delete
to authenticated
using (user_id = auth.uid());
