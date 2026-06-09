-- Phase 11: NEXUS Action Center — approval-ready drafts (no autonomous execution).

create table if not exists public.nexus_action_cards (
  id uuid primary key default gen_random_uuid(),
  action_category text not null check (
    action_category in ('communication', 'marketing', 'operational', 'growth')
  ),
  action_type text not null,
  title text not null,
  summary text not null,
  reason text not null,
  suggested_outcome text not null,
  generated_content text not null,
  status text not null default 'pending_approval' check (
    status in ('draft', 'pending_approval', 'approved', 'executed', 'rejected')
  ),
  approval_required boolean not null default true,
  created_by_label text not null default 'NEXUS',
  created_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz,
  executed_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_action_cards_status_created_idx
  on public.nexus_action_cards (status, created_at desc);

create index if not exists nexus_action_cards_category_created_idx
  on public.nexus_action_cards (action_category, created_at desc);

create index if not exists nexus_action_cards_type_created_idx
  on public.nexus_action_cards (action_type, created_at desc);

create index if not exists nexus_action_cards_metadata_dedupe_idx
  on public.nexus_action_cards ((metadata->>'dedupe_key'))
  where metadata ? 'dedupe_key';

alter table public.nexus_action_cards enable row level security;

revoke all on table public.nexus_action_cards from anon;
revoke all on table public.nexus_action_cards from authenticated;
grant all on table public.nexus_action_cards to service_role;
grant select, insert, update on table public.nexus_action_cards to authenticated;

drop policy if exists "Nexus owner reads action cards" on public.nexus_action_cards;
create policy "Nexus owner reads action cards"
on public.nexus_action_cards for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner inserts action cards" on public.nexus_action_cards;
create policy "Nexus owner inserts action cards"
on public.nexus_action_cards for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates action cards" on public.nexus_action_cards;
create policy "Nexus owner updates action cards"
on public.nexus_action_cards for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus admin reads operational action cards" on public.nexus_action_cards;
create policy "Nexus admin reads operational action cards"
on public.nexus_action_cards for select to authenticated
using (
  action_category = 'operational'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and (p.role = 'admin' or p.is_admin = true)
  )
);
