-- Prevent duplicate meet records from double-submit, retry, or concurrent create requests.

alter table public.rides
  add column if not exists create_idempotency_key uuid;

create unique index if not exists rides_host_create_idempotency_key_uidx
  on public.rides (host_id, create_idempotency_key)
  where create_idempotency_key is not null;

comment on column public.rides.create_idempotency_key is
  'Client idempotency key for meet creation. Unique per host when set.';
