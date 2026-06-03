-- Account deletion: rejected status, admin notification types, Realtime for admin queue.

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('pending', 'reviewing', 'completed', 'canceled', 'rejected'));

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'meet_joined',
    'meet_left',
    'meet_chat_message',
    'meet_chat_photo',
    'profile_followed',
    'meet_removed',
    'meet_canceled',
    'meet_ended',
    'direct_message',
    'account_deletion_requested',
    'account_deletion_canceled',
    'account_deletion_approved'
  )
);

alter table public.account_deletion_requests replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'account_deletion_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.account_deletion_requests';
  end if;
end;
$$;

notify pgrst, 'reload schema';
