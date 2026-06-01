do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'motorcycles'
      and policyname = 'Public profiles can read active rider motorcycles'
  ) then
    create policy "Public profiles can read active rider motorcycles"
    on public.motorcycles
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = motorcycles.user_id
          and profiles.status = 'active'
      )
    );
  end if;
end $$;
