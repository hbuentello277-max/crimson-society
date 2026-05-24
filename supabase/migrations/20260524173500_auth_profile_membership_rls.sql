create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  full_name text,
  avatar_url text,
  profile_image_url text,
  bio text,
  location text,
  quote text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  website_url text,
  role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists profile_image_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists quote text;
alter table public.profiles add column if not exists instagram_url text;
alter table public.profiles add column if not exists tiktok_url text;
alter table public.profiles add column if not exists youtube_url text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null and username <> '';

create table if not exists public.stripe_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stripe_customers add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.stripe_customers add column if not exists stripe_customer_id text;
alter table public.stripe_customers add column if not exists created_at timestamptz not null default now();
alter table public.stripe_customers add column if not exists updated_at timestamptz not null default now();

create unique index if not exists stripe_customers_user_id_key
  on public.stripe_customers (user_id);

create unique index if not exists stripe_customers_stripe_customer_id_key
  on public.stripe_customers (stripe_customer_id);

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  plan_type text not null unique,
  title text,
  description text,
  price numeric(10, 2) not null default 0,
  active boolean not null default true,
  perks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.membership_plans add column if not exists plan_type text;
alter table public.membership_plans add column if not exists title text;
alter table public.membership_plans add column if not exists description text;
alter table public.membership_plans add column if not exists price numeric(10, 2) not null default 0;
alter table public.membership_plans add column if not exists active boolean not null default true;
alter table public.membership_plans add column if not exists perks text[] not null default '{}';
alter table public.membership_plans add column if not exists created_at timestamptz not null default now();
alter table public.membership_plans add column if not exists updated_at timestamptz not null default now();

create unique index if not exists membership_plans_plan_type_key
  on public.membership_plans (plan_type);

insert into public.membership_plans (plan_type, title, description, price, active, perks)
values
  ('monthly', 'Monthly Plan', 'Flexible entry for Blackcard Access', 24, true, '{}'),
  ('yearly', 'Yearly Plan', 'Preferred value with priority standing', 240, true, '{}')
on conflict (plan_type) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  membership_plan_id uuid references public.membership_plans(id) on delete set null,
  plan_type text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.subscriptions add column if not exists stripe_customer_id text;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
alter table public.subscriptions add column if not exists membership_plan_id uuid references public.membership_plans(id) on delete set null;
alter table public.subscriptions add column if not exists plan_type text;
alter table public.subscriptions add column if not exists status text;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table public.subscriptions add column if not exists created_at timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

create unique index if not exists subscriptions_stripe_subscription_id_key
  on public.subscriptions (stripe_subscription_id);

create index if not exists subscriptions_user_id_status_idx
  on public.subscriptions (user_id, status, current_period_end);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_stripe_customers_updated_at on public.stripe_customers;
create trigger touch_stripe_customers_updated_at
before update on public.stripe_customers
for each row execute function public.touch_updated_at();

drop trigger if exists touch_membership_plans_updated_at on public.membership_plans;
create trigger touch_membership_plans_updated_at
before update on public.membership_plans
for each row execute function public.touch_updated_at();

drop trigger if exists touch_subscriptions_updated_at on public.subscriptions;
create trigger touch_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    display_name,
    full_name,
    avatar_url,
    profile_image_url,
    role,
    status
  )
  values (
    new.id,
    nullif(regexp_replace(lower(split_part(coalesce(new.email, 'member'), '@', 1)), '[^a-z0-9._-]', '', 'g'), ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'Crimson Member'), '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'avatar_url',
    'user',
    'active'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.membership_plans enable row level security;
alter table public.subscriptions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Profiles are readable') then
    create policy "Profiles are readable"
    on public.profiles
    for select
    using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can create their own profile') then
    create policy "Users can create their own profile"
    on public.profiles
    for insert
    with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update their own profile') then
    create policy "Users can update their own profile"
    on public.profiles
    for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'stripe_customers' and policyname = 'Users can read their own Stripe customer') then
    create policy "Users can read their own Stripe customer"
    on public.stripe_customers
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'stripe_customers' and policyname = 'Users can create their own Stripe customer') then
    create policy "Users can create their own Stripe customer"
    on public.stripe_customers
    for insert
    with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'membership_plans' and policyname = 'Active membership plans are readable') then
    create policy "Active membership plans are readable"
    on public.membership_plans
    for select
    using (active = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'membership_plans' and policyname = 'Admins can manage membership plans') then
    create policy "Admins can manage membership plans"
    on public.membership_plans
    for all
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    )
    with check (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'Users can read their own subscriptions') then
    create policy "Users can read their own subscriptions"
    on public.subscriptions
    for select
    using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'Admins can read subscriptions') then
    create policy "Admins can read subscriptions"
    on public.subscriptions
    for select
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
          and profiles.status = 'active'
      )
    );
  end if;
end;
$$;

create or replace function public.admin_update_profile_access(
  target_user_id uuid,
  new_role text,
  new_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_profile public.profiles;
  updated_profile public.profiles;
begin
  select *
  into caller_profile
  from public.profiles
  where id = auth.uid();

  if caller_profile.role <> 'admin' or caller_profile.status <> 'active' then
    raise exception 'Admins only.';
  end if;

  update public.profiles
  set role = new_role,
      status = new_status
  where id = target_user_id
  returning * into updated_profile;

  return updated_profile;
end;
$$;

revoke all on function public.admin_update_profile_access(uuid, text, text) from public;
grant execute on function public.admin_update_profile_access(uuid, text, text) to authenticated;
