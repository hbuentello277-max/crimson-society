-- Push dedupe + idempotent dispatch hardening.

alter table public.user_push_tokens
add column if not exists device_id text;

create index if not exists user_push_tokens_user_device_idx
on public.user_push_tokens (user_id, device_id)
where device_id is not null;

create index if not exists user_push_tokens_user_platform_agent_idx
on public.user_push_tokens (user_id, platform, user_agent, updated_at desc);

-- Existing rows did not have a stable browser/device id. Keep the newest enabled
-- token per user/platform/user-agent bucket and disable older duplicates.
with ranked_tokens as (
  select
    id,
    row_number() over (
      partition by user_id, platform, coalesce(user_agent, '')
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as token_rank
  from public.user_push_tokens
  where enabled = true
)
update public.user_push_tokens tokens
set enabled = false,
    updated_at = now()
from ranked_tokens
where tokens.id = ranked_tokens.id
  and ranked_tokens.token_rank > 1;

alter table public.push_notification_jobs
drop constraint if exists push_notification_jobs_status_check;

alter table public.push_notification_jobs
add constraint push_notification_jobs_status_check
check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));

create unique index if not exists push_notification_jobs_notification_id_key
on public.push_notification_jobs (notification_id);

notify pgrst, 'reload schema';
