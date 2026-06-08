-- Phase 1: scheduled meet end boundary for unified lifecycle
alter table public.rides
add column if not exists meet_duration_minutes integer null;

alter table public.rides
drop constraint if exists rides_meet_duration_minutes_check;

alter table public.rides
add constraint rides_meet_duration_minutes_check
check (meet_duration_minutes is null or meet_duration_minutes > 0);

comment on column public.rides.meet_duration_minutes is
  'Scheduled meet duration in minutes. When set, end_time = start_time + duration for lifecycle.';
