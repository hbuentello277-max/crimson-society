-- Align conversation_members.user_id with public.profiles (not orphaned auth-only IDs).

insert into public.profiles (id, status, role)
select users.id, 'active', 'user'
from auth.users users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.id = users.id
)
on conflict (id) do nothing;

alter table public.conversation_members drop constraint if exists conversation_members_user_id_fkey;

alter table public.conversation_members drop constraint if exists conversation_members_user_id_profiles_fkey;

alter table public.conversation_members
add constraint conversation_members_user_id_profiles_fkey
foreign key (user_id)
references public.profiles(id)
on delete cascade;
