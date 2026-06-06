-- Phase 9: align war room statuses with owner workflow (open, active, resolved, archived).

alter table public.nexus_war_rooms
  drop constraint if exists nexus_war_rooms_status_check;

update public.nexus_war_rooms
set status = 'active'
where status = 'stabilizing';

alter table public.nexus_war_rooms
  alter column status set default 'open';

alter table public.nexus_war_rooms
  add constraint nexus_war_rooms_status_check
  check (status in ('open', 'active', 'resolved', 'archived'));
