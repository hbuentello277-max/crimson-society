alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_language_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('en', 'es'));
  end if;
end $$;

alter table public.rides
  add column if not exists title_en text,
  add column if not exists title_es text,
  add column if not exists description_en text,
  add column if not exists description_es text,
  add column if not exists route_notes_en text,
  add column if not exists route_notes_es text,
  add column if not exists safety_notes_en text,
  add column if not exists safety_notes_es text,
  add column if not exists location_notes_en text,
  add column if not exists location_notes_es text,
  add column if not exists instructions_en text,
  add column if not exists instructions_es text;

update public.rides
set
  title_en = coalesce(title_en, nullif(btrim(name), '')),
  description_en = coalesce(description_en, nullif(btrim(description), ''))
where title_en is null
   or description_en is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preferred_language text;
begin
  preferred_language := coalesce(new.raw_user_meta_data->>'preferred_language', 'en');

  if preferred_language not in ('en', 'es') then
    preferred_language := 'en';
  end if;

  insert into public.profiles (
    id,
    username,
    display_name,
    full_name,
    avatar_url,
    profile_image_url,
    role,
    status,
    preferred_language
  )
  values (
    new.id,
    nullif(regexp_replace(lower(split_part(coalesce(new.email, 'member'), '@', 1)), '[^a-z0-9._-]', '', 'g'), ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'Crimson Member'), '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'avatar_url',
    'user',
    'active',
    preferred_language
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
