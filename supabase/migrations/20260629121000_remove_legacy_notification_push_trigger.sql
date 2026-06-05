-- The queued push path is the source of truth. Retire an older direct
-- notification->HTTP trigger that used a stale header and bypassed job
-- idempotency.

drop trigger if exists dispatch_push_for_notification_after_insert on public.notifications;
drop function if exists public.dispatch_push_for_notification();

notify pgrst, 'reload schema';
