-- Extend user_reports for post and direct-message reports.

alter table public.user_reports
add column if not exists post_id uuid references public."Posts"(id) on delete set null;

alter table public.user_reports
add column if not exists message_id uuid references public.messages(id) on delete set null;

alter table public.user_reports
add column if not exists conversation_id uuid references public.conversations(id) on delete set null;

alter table public.user_reports drop constraint if exists user_reports_target_check;

alter table public.user_reports add constraint user_reports_target_check check (
  reported_user_id is not null
  or ride_id is not null
  or post_id is not null
  or message_id is not null
  or conversation_id is not null
);

create index if not exists user_reports_post_id_idx
on public.user_reports (post_id)
where post_id is not null;

create index if not exists user_reports_message_id_idx
on public.user_reports (message_id)
where message_id is not null;

create index if not exists user_reports_conversation_id_idx
on public.user_reports (conversation_id)
where conversation_id is not null;

drop policy if exists "Users can create their own reports" on public.user_reports;

create policy "Users can create their own reports"
on public.user_reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and status = 'pending'
  and (reported_user_id is null or reported_user_id <> auth.uid())
  and (
    post_id is null
    or not exists (
      select 1
      from public."Posts" p
      where p.id = post_id
        and p.user_id = auth.uid()
    )
  )
  and (
    message_id is null
    or not exists (
      select 1
      from public.messages m
      where m.id = message_id
        and m.sender_id = auth.uid()
    )
  )
  and (
    reported_user_id is not null
    or ride_id is not null
    or post_id is not null
    or message_id is not null
    or conversation_id is not null
  )
);
