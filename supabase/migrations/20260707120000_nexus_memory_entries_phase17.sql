-- Phase 17: Nexus Memory entries for operational history.

create table if not exists public.nexus_memory_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (
    entry_type in (
      'deployment',
      'milestone',
      'growth',
      'revenue',
      'incident',
      'alert',
      'briefing',
      'report',
      'intelligence',
      'command',
      'owner_note'
    )
  ),
  title text not null,
  summary text not null,
  source text not null,
  importance_score integer not null default 5 check (importance_score between 1 and 10),
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists nexus_memory_entries_type_occurred_idx
  on public.nexus_memory_entries (entry_type, occurred_at desc);

create index if not exists nexus_memory_entries_occurred_idx
  on public.nexus_memory_entries (occurred_at desc);

create index if not exists nexus_memory_entries_importance_idx
  on public.nexus_memory_entries (importance_score desc, occurred_at desc);

create index if not exists nexus_memory_entries_metadata_dedupe_idx
  on public.nexus_memory_entries ((metadata->>'dedupe_key'))
  where metadata ? 'dedupe_key';

alter table public.nexus_memory_entries enable row level security;

revoke all on table public.nexus_memory_entries from anon;
revoke all on table public.nexus_memory_entries from authenticated;
grant all on table public.nexus_memory_entries to service_role;
grant select, insert, update on table public.nexus_memory_entries to authenticated;

drop policy if exists "Nexus owner reads memory entries" on public.nexus_memory_entries;
create policy "Nexus owner reads memory entries"
on public.nexus_memory_entries for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner inserts memory entries" on public.nexus_memory_entries;
create policy "Nexus owner inserts memory entries"
on public.nexus_memory_entries for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates memory entries" on public.nexus_memory_entries;
create policy "Nexus owner updates memory entries"
on public.nexus_memory_entries for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));
