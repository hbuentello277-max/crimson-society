-- Phase 7 commerce hardening:
-- - make Stripe webhook event claiming atomic/retryable
-- - remove direct browser/client execute access from admin/internal commerce RPCs
-- - keep owner/admin controls available through service-role API routes

alter table public.stripe_webhook_events
  add column if not exists status text not null default 'processed',
  add column if not exists received_at timestamptz not null default now(),
  add column if not exists attempts integer not null default 0,
  add column if not exists last_error text;

alter table public.stripe_webhook_events
  alter column processed_at drop not null;

alter table public.stripe_webhook_events
  drop constraint if exists stripe_webhook_events_status_check;

alter table public.stripe_webhook_events
  add constraint stripe_webhook_events_status_check
  check (status in ('processing', 'processed', 'failed'));

create index if not exists stripe_webhook_events_status_idx
  on public.stripe_webhook_events (status, received_at desc);

do $$
declare
  fn regprocedure;
begin
  foreach fn in array array[
    to_regprocedure('public.award_crimson_credits(uuid, integer, text, text, text, jsonb)'),
    to_regprocedure('public.award_referral_blackcard_conversion(uuid)'),
    to_regprocedure('public.admin_adjust_crimson_credits(uuid, integer, text, uuid, jsonb)'),
    to_regprocedure('public.admin_update_crimson_credit_redemption(uuid, text, uuid, text, text)'),
    to_regprocedure('public.admin_update_profile_access(uuid, text, text)'),
    to_regprocedure('public.admin_set_manual_premium(uuid, boolean, text, timestamptz)'),
    to_regprocedure('public.product_inventory_apply_map(uuid, jsonb)'),
    to_regprocedure('public.product_inventory_reserve(uuid, text, integer, text, uuid, uuid, integer)'),
    to_regprocedure('public.product_inventory_release_reservation(uuid)'),
    to_regprocedure('public.product_inventory_complete_reservation(uuid)'),
    to_regprocedure('public.product_inventory_assert_available(uuid, boolean, text, integer)'),
    to_regprocedure('public.product_inventory_decrement_for_redemption(uuid, boolean, text, integer)'),
    to_regprocedure('public.product_inventory_restore_for_cancellation(uuid, boolean, text, integer)'),
    to_regprocedure('public.product_inventory_expire_stale_reservations()'),
    to_regprocedure('public.product_inventory_mirror_to_reward(uuid)'),
    to_regprocedure('public.product_inventory_recompute_totals(uuid)'),
    to_regprocedure('public.product_inventory_apply_map(uuid, jsonb)'),
    to_regprocedure('public.sync_shop_credit_reward_product(uuid)'),
    to_regprocedure('public.sync_profile_blackcard_public(uuid)'),
    to_regprocedure('public.sync_profile_membership_tier(uuid)'),
    to_regprocedure('public.sync_profile_premium(uuid)'),
    to_regprocedure('public.upsert_billing_customer(uuid, text, text)'),
    to_regprocedure('public.upsert_billing_subscription(uuid, text, text, text, text, text, text, text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, jsonb)'),
    to_regprocedure('public.upsert_billing_invoice(uuid, text, text, text, text, text, text, integer, integer, integer, integer, text, text, timestamptz, timestamptz, timestamptz, timestamptz, jsonb)'),
    to_regprocedure('public.cancel_billing_subscription(text, text, timestamptz, timestamptz)'),
    to_regprocedure('public.get_user_id_by_stripe_customer(text)'),
    to_regprocedure('public.log_stripe_webhook_event(text, text, boolean, jsonb)'),
    to_regprocedure('public.mark_stripe_webhook_processed(text)'),
    to_regprocedure('public.mark_stripe_webhook_failed(text, text)')
  ]
  loop
    if fn is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', fn);
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end;
$$;

-- User-facing credit/rewards RPCs remain callable by authenticated users only.
do $$
declare
  fn regprocedure;
begin
  foreach fn in array array[
    to_regprocedure('public.redeem_crimson_credit_reward(uuid, text)'),
    to_regprocedure('public.get_crimson_credits_summary(uuid)'),
    to_regprocedure('public.crimson_credits_monthly_cash_redemption_used(uuid)'),
    to_regprocedure('public.crimson_credits_monthly_cash_redemption_cap()'),
    to_regprocedure('public.crimson_credits_member_can_redeem(uuid)'),
    to_regprocedure('public.crimson_credits_economy_settings()'),
    to_regprocedure('public.resolve_profile_membership_tier(uuid)'),
    to_regprocedure('public.user_has_blackcard_access(uuid)'),
    to_regprocedure('public.profile_has_admin_blackcard_override(uuid)'),
    to_regprocedure('public.attribute_referral(text)'),
    to_regprocedure('public.set_own_referral_code(text)'),
    to_regprocedure('public.ensure_own_referral_code()'),
    to_regprocedure('public.get_own_referral_stats()'),
    to_regprocedure('public.request_account_deletion(text)'),
    to_regprocedure('public.cancel_account_deletion_request()')
  ]
  loop
    if fn is not null then
      execute format('revoke execute on function %s from public, anon', fn);
      execute format('grant execute on function %s to authenticated, service_role', fn);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
