-- Repair push token RLS/grants if table was created without full migration.

alter table public.profiles
add column if not exists push_notifications_enabled boolean not null default true;

alter table public.user_push_tokens enable row level security;

drop policy if exists "Users manage own push tokens" on public.user_push_tokens;
create policy "Users manage own push tokens"
on public.user_push_tokens
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update, delete on public.user_push_tokens to authenticated;
grant all on public.user_push_tokens to service_role;
