create table if not exists public.crimson_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credits_balance integer not null default 0,
  lifetime_credits_earned integer not null default 0,
  lifetime_credits_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crimson_credits_balance_nonnegative check (credits_balance >= 0),
  constraint crimson_credits_earned_nonnegative check (lifetime_credits_earned >= 0),
  constraint crimson_credits_spent_nonnegative check (lifetime_credits_spent >= 0)
);

alter table public.crimson_credits add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.crimson_credits add column if not exists credits_balance integer not null default 0;
alter table public.crimson_credits add column if not exists lifetime_credits_earned integer not null default 0;
alter table public.crimson_credits add column if not exists lifetime_credits_spent integer not null default 0;
alter table public.crimson_credits add column if not exists created_at timestamptz not null default now();
alter table public.crimson_credits add column if not exists updated_at timestamptz not null default now();

create unique index if not exists crimson_credits_user_id_key
  on public.crimson_credits (user_id);

create table if not exists public.crimson_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  transaction_type text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.crimson_credit_transactions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.crimson_credit_transactions add column if not exists amount integer not null default 0;
alter table public.crimson_credit_transactions add column if not exists transaction_type text not null default 'adjustment';
alter table public.crimson_credit_transactions add column if not exists reason text;
alter table public.crimson_credit_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.crimson_credit_transactions add column if not exists created_at timestamptz not null default now();

create index if not exists crimson_credit_transactions_user_id_created_at_idx
  on public.crimson_credit_transactions (user_id, created_at desc);

drop trigger if exists touch_crimson_credits_updated_at on public.crimson_credits;
create trigger touch_crimson_credits_updated_at
before update on public.crimson_credits
for each row execute function public.touch_updated_at();

alter table public.crimson_credits enable row level security;
alter table public.crimson_credit_transactions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'crimson_credits' and policyname = 'Users can read their own Crimson Credits') then
    create policy "Users can read their own Crimson Credits"
    on public.crimson_credits
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'crimson_credit_transactions' and policyname = 'Users can read their own Crimson Credit transactions') then
    create policy "Users can read their own Crimson Credit transactions"
    on public.crimson_credit_transactions
    for select
    using (auth.uid() = user_id);
  end if;
end;
$$;
