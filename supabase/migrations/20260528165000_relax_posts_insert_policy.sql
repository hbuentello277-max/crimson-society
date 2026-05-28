begin;

drop policy if exists "Users can create own posts" on public."Posts";
drop policy if exists "Users can insert own posts" on public."Posts";
drop policy if exists "Authenticated users can create posts" on public."Posts";

create policy "Authenticated users can create posts"
on public."Posts"
for insert
to authenticated
with check (
  auth.uid() = user_id
);

commit;