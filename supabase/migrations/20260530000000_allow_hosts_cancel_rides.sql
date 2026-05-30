alter table public.rides enable row level security;

drop policy if exists "Hosts can update own rides" on public.rides;

create policy "Hosts can update own rides"
on public.rides
for update
to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());
