alter table public.push_notification_jobs
add column if not exists sent_count integer not null default 0;

notify pgrst, 'reload schema';
