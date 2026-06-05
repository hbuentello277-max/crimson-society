-- Shop order in-app notifications (admin + customer).

alter table public.notifications drop constraint if exists notifications_type_check;

alter table public.notifications add constraint notifications_type_check check (
  type in (
    'meet_joined', 'meet_left', 'meet_chat_message', 'meet_chat_photo',
    'profile_followed', 'meet_removed', 'meet_canceled', 'meet_ended',
    'direct_message', 'post_liked', 'post_commented',
    'account_deletion_requested', 'account_deletion_canceled', 'account_deletion_approved',
    'favorite_rider_meet', 'favorite_rider_post', 'favorite_rider_ride_started',
    'host_meet_created',
    'shop_order_paid',
    'shop_order_confirmed',
    'shop_order_ready_for_pickup',
    'shop_order_shipped'
  )
);
