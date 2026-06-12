-- Rider SOS Phase 1: private emergency profile setup (not publicly readable).

create table if not exists public.rider_sos_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  relationship text not null default '',
  blood_type text,
  allergies text,
  medical_notes text,
  bike_info text,
  location_sharing_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists touch_rider_sos_profiles_updated_at on public.rider_sos_profiles;
create trigger touch_rider_sos_profiles_updated_at
before update on public.rider_sos_profiles
for each row execute function public.touch_updated_at();

alter table public.rider_sos_profiles enable row level security;

drop policy if exists "Users read own rider sos profile" on public.rider_sos_profiles;
create policy "Users read own rider sos profile"
on public.rider_sos_profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users insert own rider sos profile" on public.rider_sos_profiles;
create policy "Users insert own rider sos profile"
on public.rider_sos_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users update own rider sos profile" on public.rider_sos_profiles;
create policy "Users update own rider sos profile"
on public.rider_sos_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users delete own rider sos profile" on public.rider_sos_profiles;
create policy "Users delete own rider sos profile"
on public.rider_sos_profiles
for delete
to authenticated
using (user_id = auth.uid());

revoke all on public.rider_sos_profiles from anon;
grant select, insert, update, delete on public.rider_sos_profiles to authenticated;
grant all on public.rider_sos_profiles to service_role;
