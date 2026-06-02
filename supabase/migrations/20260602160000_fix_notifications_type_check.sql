-- Correct notifications_type_check after meet_host_moderation omitted profile_followed.
-- Safe on databases that already contain production notification rows.

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
    'meet_ended'
  )
);
