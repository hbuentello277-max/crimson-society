-- Automatic push dispatch via pg_net when production URL + secret are configured.
-- After deploy, enable in SQL Editor (service role):
--
--   update public.push_dispatch_config
--   set
--     dispatch_url = 'https://YOUR_DOMAIN/api/push/dispatch',
--     dispatch_secret = '<PUSH_DISPATCH_SECRET>',
--     enabled = true,
--     updated_at = now()
--   where singleton = true;

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_dispatch_config (
  singleton boolean primary key default true check (singleton = true),
  dispatch_url text,
  dispatch_secret text,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.push_dispatch_config (singleton, enabled)
values (true, false)
on conflict (singleton) do nothing;

alter table public.push_dispatch_config enable row level security;

revoke all on table public.push_dispatch_config from anon, authenticated;

create or replace function public.dispatch_push_job_http()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  cfg record;
  request_id bigint;
begin
  if NEW.status is distinct from 'pending' then
    return NEW;
  end if;

  select dispatch_url, dispatch_secret, enabled
  into cfg
  from public.push_dispatch_config
  where singleton = true;

  if not coalesce(cfg.enabled, false) then
    return NEW;
  end if;

  if cfg.dispatch_url is null or cfg.dispatch_secret is null then
    return NEW;
  end if;

  select net.http_post(
    url := cfg.dispatch_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-dispatch-secret', cfg.dispatch_secret
    ),
    body := jsonb_build_object('notification_id', NEW.notification_id::text)
  )
  into request_id;

  return NEW;
exception
  when others then
    -- Never block notification inserts if HTTP dispatch fails.
    return NEW;
end;
$$;

drop trigger if exists dispatch_push_job_http_after_insert on public.push_notification_jobs;

create trigger dispatch_push_job_http_after_insert
after insert on public.push_notification_jobs
for each row
execute function public.dispatch_push_job_http();
