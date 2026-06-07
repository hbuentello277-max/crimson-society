-- Phase 30: AI-assisted analysis audit trail (question + sources only; no response body).

create table if not exists public.nexus_ai_analysis_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 500),
  sources_consulted text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists nexus_ai_analysis_log_owner_created_idx
  on public.nexus_ai_analysis_log (owner_id, created_at desc);

create index if not exists nexus_ai_analysis_log_created_idx
  on public.nexus_ai_analysis_log (created_at desc);

alter table public.nexus_ai_analysis_log enable row level security;

revoke all on table public.nexus_ai_analysis_log from anon;
revoke all on table public.nexus_ai_analysis_log from authenticated;
grant all on table public.nexus_ai_analysis_log to service_role;

drop policy if exists "Nexus owner reads AI analysis log" on public.nexus_ai_analysis_log;
create policy "Nexus owner reads AI analysis log"
on public.nexus_ai_analysis_log for select to authenticated
using (public.is_platform_owner(auth.uid()));

grant select on table public.nexus_ai_analysis_log to authenticated;
