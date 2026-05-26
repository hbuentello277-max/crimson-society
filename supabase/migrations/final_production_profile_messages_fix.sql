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
  city text,
  state text,
  riding_area text,
  bike_type text,
  riding_style text,
  website text,
  instagram text,
  tiktok text,
  youtube text,
  website_url text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  quote text,
  role text not null default 'user',
  status text not null default 'active',
  is_admin boolean not null default false,
  membership_status text not null default 'inactive',
  membership_tier text,
  profile_tags text[] not null default '{}',
  hide_location_from_suggestions boolean not null default false,
  hide_from_suggestions boolean not null default false,
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
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists riding_area text;
alter table public.profiles add column if not exists bike_type text;
alter table public.profiles add column if not exists riding_style text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists instagram text;
alter table public.profiles add column if not exists tiktok text;
alter table public.profiles add column if not exists youtube text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists instagram_url text;
alter table public.profiles add column if not exists tiktok_url text;
alter table public.profiles add column if not exists youtube_url text;
alter table public.profiles add column if not exists quote text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists membership_status text not null default 'inactive';
alter table public.profiles add column if not exists membership_tier text;
alter table public.profiles add column if not exists profile_tags text[] not null default '{}';
alter table public.profiles add column if not exists hide_location_from_suggestions boolean not null default false;
alter table public.profiles add column if not exists hide_from_suggestions boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  connection_key text not null unique,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.user_connections add column if not exists requester_id uuid references auth.users(id) on delete cascade;
alter table public.user_connections add column if not exists addressee_id uuid references auth.users(id) on delete cascade;
alter table public.user_connections add column if not exists connection_key text;
alter table public.user_connections add column if not exists status text not null default 'pending';
alter table public.user_connections add column if not exists created_at timestamptz not null default now();
alter table public.user_connections add column if not exists updated_at timestamptz not null default now();
alter table public.user_connections add column if not exists accepted_at timestamptz;

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.user_blocks add column if not exists blocker_id uuid references auth.users(id) on delete cascade;
alter table public.user_blocks add column if not exists blocked_id uuid references auth.users(id) on delete cascade;
alter table public.user_blocks add column if not exists reason text;
alter table public.user_blocks add column if not exists created_at timestamptz not null default now();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'direct',
  title text,
  avatar_url text,
  direct_key text unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations add column if not exists conversation_type text not null default 'direct';
alter table public.conversations add column if not exists title text;
alter table public.conversations add column if not exists avatar_url text;
alter table public.conversations add column if not exists direct_key text;
alter table public.conversations add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.conversations add column if not exists created_at timestamptz not null default now();
alter table public.conversations add column if not exists updated_at timestamptz not null default now();

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.conversation_members add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.conversation_members add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.conversation_members add column if not exists last_read_at timestamptz;
alter table public.conversation_members add column if not exists created_at timestamptz not null default now();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  created_at timestamptz not null default now()
);

alter table public.messages add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;
alter table public.messages add column if not exists sender_id uuid references auth.users(id) on delete cascade;
alter table public.messages add column if not exists body text;
alter table public.messages add column if not exists created_at timestamptz not null default now();

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  plan_type text not null unique,
  title text,
  description text,
  price numeric(10, 2) not null default 0,
  stripe_price_id text,
  active boolean not null default true,
  perks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.membership_plans add column if not exists plan_type text;
alter table public.membership_plans add column if not exists title text;
alter table public.membership_plans add column if not exists description text;
alter table public.membership_plans add column if not exists price numeric(10, 2) not null default 0;
alter table public.membership_plans add column if not exists stripe_price_id text;
alter table public.membership_plans add column if not exists active boolean not null default true;
alter table public.membership_plans add column if not exists perks text[] not null default '{}';
alter table public.membership_plans add column if not exists created_at timestamptz not null default now();
alter table public.membership_plans add column if not exists updated_at timestamptz not null default now();

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

create unique index if not exists profiles_username_key on public.profiles (lower(username)) where username is not null and username <> '';
create index if not exists profiles_discovery_region_idx on public.profiles (city, state) where status = 'active' and hide_from_suggestions = false;
create index if not exists profiles_discovery_style_idx on public.profiles (riding_style, bike_type) where status = 'active' and hide_from_suggestions = false;

create unique index if not exists user_connections_connection_key_key on public.user_connections (connection_key);
create index if not exists user_connections_requester_idx on public.user_connections (requester_id, status, created_at desc);
create index if not exists user_connections_addressee_idx on public.user_connections (addressee_id, status, created_at desc);

create unique index if not exists user_blocks_blocker_blocked_key on public.user_blocks (blocker_id, blocked_id);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id, created_at desc);

create unique index if not exists conversations_direct_key_key on public.conversations (direct_key) where direct_key is not null;
create index if not exists conversations_created_by_idx on public.conversations (created_by, updated_at desc);
create unique index if not exists conversation_members_conversation_user_key on public.conversation_members (conversation_id, user_id);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id, created_at desc);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at asc);
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);

create unique index if not exists membership_plans_plan_type_key on public.membership_plans (plan_type);
create unique index if not exists subscriptions_stripe_subscription_id_key on public.subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;
create index if not exists subscriptions_user_active_period_idx on public.subscriptions (user_id, status, current_period_end desc);

update public.profiles
set
  website_url = coalesce(website_url, website),
  instagram_url = coalesce(instagram_url, instagram),
  tiktok_url = coalesce(tiktok_url, tiktok),
  youtube_url = coalesce(youtube_url, youtube),
  website = coalesce(website, website_url),
  instagram = coalesce(instagram, instagram_url),
  tiktok = coalesce(tiktok, tiktok_url),
  youtube = coalesce(youtube, youtube_url),
  city = coalesce(city, nullif(trim(split_part(location, ',', 1)), '')),
  state = coalesce(state, nullif(trim(split_part(location, ',', 2)), '')),
  riding_area = coalesce(riding_area, nullif(trim(location), '')),
  full_name = coalesce(full_name, display_name),
  is_admin = coalesce(is_admin, role = 'admin'),
  membership_status = coalesce(membership_status, 'inactive')
where true;

insert into public.membership_plans (plan_type, title, description, price, active, perks)
values
  ('monthly', 'Monthly Plan', 'Flexible entry for Blackcard Access', 0, true, '{}'),
  ('yearly', 'Yearly Plan', 'Preferred value with priority standing', 0, true, '{}')
on conflict (plan_type) do nothing;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.connection_key_for(first_user_id uuid, second_user_id uuid)
returns text
language sql
immutable
as $$
  select least(first_user_id::text, second_user_id::text) || ':' || greatest(first_user_id::text, second_user_id::text);
$$;

create or replace function public.users_are_blocked(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_blocks
    where (blocker_id = first_user_id and blocked_id = second_user_id)
       or (blocker_id = second_user_id and blocked_id = first_user_id)
  );
$$;

create or replace function public.users_are_connected(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_connections
    where status = 'accepted'
      and (
        (requester_id = first_user_id and addressee_id = second_user_id)
        or (requester_id = second_user_id and addressee_id = first_user_id)
      )
  );
$$;

create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and user_id = target_user_id
  );
$$;

create or replace function public.is_profile_admin(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and (
        is_admin = true
        or role = 'admin'
      )
      and status = 'active'
  );
$$;

create or replace function public.prevent_profile_privilege_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role = coalesce(new.role, 'user');
    new.status = coalesce(new.status, 'active');
    new.is_admin = coalesce(new.is_admin, false);
    new.membership_status = coalesce(new.membership_status, 'inactive');

    if new.role <> 'user' or new.status <> 'active' or new.is_admin <> false then
      raise exception 'Profile role, status, and admin flags can only be set by admin controls.';
    end if;

    return new;
  end if;

  if auth.uid() = old.id and (
    new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.is_admin is distinct from old.is_admin
    or new.membership_status is distinct from old.membership_status
    or new.membership_tier is distinct from old.membership_tier
  ) then
    raise exception 'Profile privileged fields can only be changed by admin controls.';
  end if;

  return new;
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
  target_profile public.profiles;
  updated_profile public.profiles;
  active_admin_count integer;
begin
  if new_role not in ('user', 'moderator', 'admin') then
    raise exception 'Invalid role.';
  end if;

  if new_status not in ('active', 'limited', 'suspended', 'blocked') then
    raise exception 'Invalid status.';
  end if;

  select *
  into caller_profile
  from public.profiles
  where id = auth.uid();

  if caller_profile.id is null
    or caller_profile.status <> 'active'
    or (caller_profile.role <> 'admin' and caller_profile.is_admin is distinct from true) then
    raise exception 'Admins only.';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = target_user_id;

  if target_profile.id is null then
    raise exception 'Profile not found.';
  end if;

  if (target_profile.role = 'admin' or target_profile.is_admin = true)
    and target_profile.status = 'active'
    and (new_role <> 'admin' or new_status <> 'active') then
    select count(*)
    into active_admin_count
    from public.profiles
    where (role = 'admin' or is_admin = true)
      and status = 'active';

    if active_admin_count <= 1 then
      raise exception 'At least one active admin is required.';
    end if;
  end if;

  update public.profiles
  set role = new_role,
      status = new_status,
      is_admin = (new_role = 'admin')
  where id = target_user_id
  returning * into updated_profile;

  return updated_profile;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_user_connections_updated_at on public.user_connections;
create trigger touch_user_connections_updated_at
before update on public.user_connections
for each row execute function public.touch_updated_at();

drop trigger if exists touch_conversations_updated_at on public.conversations;
create trigger touch_conversations_updated_at
before update on public.conversations
for each row execute function public.touch_updated_at();

drop trigger if exists touch_membership_plans_updated_at on public.membership_plans;
create trigger touch_membership_plans_updated_at
before update on public.membership_plans
for each row execute function public.touch_updated_at();

drop trigger if exists touch_subscriptions_updated_at on public.subscriptions;
create trigger touch_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.touch_updated_at();

drop trigger if exists prevent_profile_privilege_self_update on public.profiles;
create trigger prevent_profile_privilege_self_update
before insert or update on public.profiles
for each row execute function public.prevent_profile_privilege_self_update();

alter table public.profiles enable row level security;
alter table public.user_connections enable row level security;
alter table public.user_blocks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.membership_plans enable row level security;
alter table public.subscriptions enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
  end loop;

  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'user_connections' loop
    execute format('drop policy if exists %I on public.user_connections', policy_record.policyname);
  end loop;

  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'user_blocks' loop
    execute format('drop policy if exists %I on public.user_blocks', policy_record.policyname);
  end loop;

  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'conversations' loop
    execute format('drop policy if exists %I on public.conversations', policy_record.policyname);
  end loop;

  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'conversation_members' loop
    execute format('drop policy if exists %I on public.conversation_members', policy_record.policyname);
  end loop;

  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'messages' loop
    execute format('drop policy if exists %I on public.messages', policy_record.policyname);
  end loop;

  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'membership_plans' loop
    execute format('drop policy if exists %I on public.membership_plans', policy_record.policyname);
  end loop;

  for policy_record in select policyname from pg_policies where schemaname = 'public' and tablename = 'subscriptions' loop
    execute format('drop policy if exists %I on public.subscriptions', policy_record.policyname);
  end loop;
end;
$$;

create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can create their own standard profile"
on public.profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and role = 'user'
  and status = 'active'
  and is_admin = false
);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can read their own connections"
on public.user_connections
for select
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can request connections"
on public.user_connections
for insert
to authenticated
with check (
  auth.uid() = requester_id
  and requester_id <> addressee_id
  and connection_key = public.connection_key_for(requester_id, addressee_id)
  and status = 'pending'
  and not public.users_are_blocked(requester_id, addressee_id)
);

create policy "Users can respond to connection requests"
on public.user_connections
for update
to authenticated
using (auth.uid() = requester_id or auth.uid() = addressee_id)
with check (
  auth.uid() = requester_id
  or (
    auth.uid() = addressee_id
    and status in ('accepted', 'declined')
    and not public.users_are_blocked(requester_id, addressee_id)
  )
);

create policy "Users can read their own blocks"
on public.user_blocks
for select
to authenticated
using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "Users can block others"
on public.user_blocks
for insert
to authenticated
with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

create policy "Users can remove their own blocks"
on public.user_blocks
for delete
to authenticated
using (auth.uid() = blocker_id);

create policy "Users can read their conversations"
on public.conversations
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_conversation_member(id, auth.uid())
);

create policy "Users can create conversations"
on public.conversations
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Conversation members can update conversations"
on public.conversations
for update
to authenticated
using (
  created_by = auth.uid()
  or public.is_conversation_member(id, auth.uid())
)
with check (
  created_by = auth.uid()
  or public.is_conversation_member(id, auth.uid())
);

create policy "Users can read conversation memberships"
on public.conversation_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_conversation_member(conversation_id, auth.uid())
);

create policy "Users can join conversations they create"
on public.conversation_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.conversations
    where conversations.id = conversation_members.conversation_id
      and conversations.created_by = auth.uid()
      and not public.users_are_blocked(auth.uid(), conversation_members.user_id)
  )
);

create policy "Users can update their conversation membership"
on public.conversation_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Members can read messages"
on public.messages
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "Members can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
  and not exists (
    select 1
    from public.conversation_members other_members
    where other_members.conversation_id = messages.conversation_id
      and other_members.user_id <> auth.uid()
      and public.users_are_blocked(auth.uid(), other_members.user_id)
  )
);

create policy "Active membership plans are readable"
on public.membership_plans
for select
to authenticated
using (active = true or public.is_profile_admin(auth.uid()));

create policy "Admins can manage membership plans"
on public.membership_plans
for all
to authenticated
using (public.is_profile_admin(auth.uid()))
with check (public.is_profile_admin(auth.uid()));

create policy "Users can read their own subscriptions"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id or public.is_profile_admin(auth.uid()));

revoke all on function public.connection_key_for(uuid, uuid) from public;
revoke all on function public.users_are_blocked(uuid, uuid) from public;
revoke all on function public.users_are_connected(uuid, uuid) from public;
revoke all on function public.is_conversation_member(uuid, uuid) from public;
revoke all on function public.is_profile_admin(uuid) from public;
revoke all on function public.admin_update_profile_access(uuid, text, text) from public;

grant execute on function public.connection_key_for(uuid, uuid) to authenticated;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;
grant execute on function public.users_are_connected(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;
grant execute on function public.is_profile_admin(uuid) to authenticated;
grant execute on function public.admin_update_profile_access(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
