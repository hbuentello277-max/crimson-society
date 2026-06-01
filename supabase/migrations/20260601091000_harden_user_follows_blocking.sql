drop policy if exists "Users can follow as themselves" on public.user_follows;
create policy "Users can follow as themselves"
on public.user_follows
for insert
to authenticated
with check (
  follower_id = auth.uid()
  and following_id <> auth.uid()
  and not public.users_are_blocked(follower_id, following_id)
);
