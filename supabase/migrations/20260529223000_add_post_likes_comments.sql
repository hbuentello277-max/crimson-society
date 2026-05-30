create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public."Posts"(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public."Posts"(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "Post likes are readable" on public.post_likes;
create policy "Post likes are readable"
on public.post_likes for select
to authenticated
using (true);

drop policy if exists "Users can like posts" on public.post_likes;
create policy "Users can like posts"
on public.post_likes for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can unlike own likes" on public.post_likes;
create policy "Users can unlike own likes"
on public.post_likes for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Post comments are readable" on public.post_comments;
create policy "Post comments are readable"
on public.post_comments for select
to authenticated
using (true);

drop policy if exists "Users can comment on posts" on public.post_comments;
create policy "Users can comment on posts"
on public.post_comments for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on public.post_comments;
create policy "Users can delete own comments"
on public.post_comments for delete
to authenticated
using (auth.uid() = user_id);
