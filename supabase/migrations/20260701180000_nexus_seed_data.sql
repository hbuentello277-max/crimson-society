-- Nexus Mark I: seed integrations, mission workflows, and alert rules.

insert into public.nexus_integrations (slug, display_name, status, config)
values
  ('supabase', 'Supabase', 'unknown', '{}'::jsonb),
  ('stripe', 'Stripe', 'unknown', '{}'::jsonb),
  ('github', 'GitHub', 'unknown', '{}'::jsonb),
  ('vercel', 'Vercel', 'unknown', '{}'::jsonb),
  ('resend', 'Resend', 'unknown', '{}'::jsonb),
  ('crimson_society', 'Crimson Society', 'unknown', '{}'::jsonb)
on conflict (slug) do nothing;

insert into public.nexus_mission_workflows (slug, display_name, category, description, weight)
values
  ('user_signup', 'User Signup', 'auth', 'New member account creation', 1.0),
  ('user_login', 'User Login', 'auth', 'Member authentication sessions', 1.0),
  ('profile_setup', 'Profile Setup', 'auth', 'Username and profile completion', 0.8),
  ('post_creation', 'Post Creation', 'social', 'Community post publishing', 0.9),
  ('meet_creation', 'Meet Creation', 'meets', 'Ride/meet creation flow', 1.0),
  ('meet_joining', 'Meet Joining', 'meets', 'Ride/meet attendance joins', 1.0),
  ('messaging', 'Messaging', 'messaging', 'Direct message delivery', 1.0),
  ('blackcard_purchase', 'Blackcard Purchase', 'commerce', 'Subscription checkout completion', 1.0),
  ('stripe_webhook_processing', 'Stripe Webhook Processing', 'commerce', 'Billing webhook ingestion', 1.0),
  ('push_notification_delivery', 'Push Notification Delivery', 'notifications', 'FCM push job delivery', 0.9),
  ('media_upload', 'Media Upload', 'media', 'Image and media upload pipeline', 0.9)
on conflict (slug) do nothing;

insert into public.nexus_alert_rules (rule_id, name, category, severity, condition, cooldown_minutes)
values
  (
    'health.integration.down',
    'Integration Down',
    'infra',
    'critical',
    '{"type": "integration_status", "status": "down"}'::jsonb,
    30
  ),
  (
    'health.integration.degraded',
    'Integration Degraded',
    'infra',
    'warning',
    '{"type": "integration_status", "status": "degraded", "duration_minutes": 30}'::jsonb,
    60
  ),
  (
    'deploy.production.failed',
    'Production Deployment Failed',
    'infra',
    'critical',
    '{"type": "deployment_status", "environment": "production", "status": "error"}'::jsonb,
    30
  ),
  (
    'stripe.webhook.failures',
    'Stripe Webhook Failures',
    'commerce',
    'critical',
    '{"type": "threshold", "source": "stripe_webhook_events", "field": "failed_count", "operator": "gt", "value": 3, "window_minutes": 60}'::jsonb,
    60
  ),
  (
    'stripe.subscription.churn_spike',
    'Subscription Churn Spike',
    'revenue',
    'warning',
    '{"type": "threshold", "metric_key": "blackcard.cancellations_daily", "operator": "gt_multiplier", "value": 2}'::jsonb,
    120
  ),
  (
    'revenue.mrr.drop',
    'Revenue Decline',
    'revenue',
    'warning',
    '{"type": "threshold", "metric_key": "revenue.mrr", "operator": "drop_pct", "value": 10, "window_days": 7}'::jsonb,
    360
  ),
  (
    'growth.signup.drop',
    'Signup Rate Declining',
    'growth',
    'warning',
    '{"type": "threshold", "metric_key": "growth.signups_daily", "operator": "lt_avg_pct", "value": 50, "window_days": 7}'::jsonb,
    360
  ),
  (
    'growth.signup.spike',
    'Signup Spike',
    'growth',
    'info',
    '{"type": "threshold", "metric_key": "growth.signups_daily", "operator": "gt_avg_pct", "value": 200, "window_days": 7}'::jsonb,
    360
  ),
  (
    'auth.login.failures',
    'Elevated Login Failures',
    'security',
    'warning',
    '{"type": "threshold", "field": "login_failures", "operator": "gt", "value": 50, "window_minutes": 60}'::jsonb,
    60
  ),
  (
    'email.resend.failures',
    'Email Delivery Issues',
    'infra',
    'warning',
    '{"type": "threshold", "source": "shop_order_email_events", "field": "failed_count", "operator": "gt", "value": 2, "window_hours": 24}'::jsonb,
    120
  ),
  (
    'push.queue.backlog',
    'Push Notification Backlog',
    'infra',
    'warning',
    '{"type": "threshold", "source": "push_notification_jobs", "field": "pending_count", "operator": "gt", "value": 500}'::jsonb,
    60
  ),
  (
    'security.report.spike',
    'Increased User Reports',
    'security',
    'warning',
    '{"type": "threshold", "source": "user_reports", "operator": "gt_avg_multiplier", "value": 3, "window_days": 1}'::jsonb,
    120
  ),
  (
    'mission.score.critical',
    'Mission Health Critical',
    'mission',
    'critical',
    '{"type": "threshold", "metric_key": "mission.health_score", "operator": "lt", "value": 50}'::jsonb,
    30
  ),
  (
    'mission.score.degraded',
    'Mission Health Degraded',
    'mission',
    'warning',
    '{"type": "threshold", "metric_key": "mission.health_score", "operator": "lt", "value": 70, "duration_minutes": 15}'::jsonb,
    60
  ),
  (
    'mission.workflow.failing',
    'Mission Workflow Failing',
    'mission',
    'critical',
    '{"type": "workflow_status", "status": "failing"}'::jsonb,
    30
  ),
  (
    'mission.workflow.degraded',
    'Mission Workflow Degraded',
    'mission',
    'warning',
    '{"type": "workflow_status", "status": "degraded", "duration_minutes": 30}'::jsonb,
    60
  ),
  (
    'mission.signup.blocked',
    'Signup Workflow Blocked',
    'mission',
    'critical',
    '{"type": "workflow_slug", "slug": "user_signup", "status": "failing"}'::jsonb,
    30
  ),
  (
    'mission.blackcard.blocked',
    'Blackcard Purchase Blocked',
    'mission',
    'critical',
    '{"type": "workflow_slug", "slug": "blackcard_purchase", "status": "failing"}'::jsonb,
    30
  ),
  (
    'mission.messaging.blocked',
    'Messaging Workflow Blocked',
    'mission',
    'warning',
    '{"type": "workflow_slug", "slug": "messaging", "status": "failing"}'::jsonb,
    30
  )
on conflict (rule_id) do nothing;
