-- Phase 10: Nexus Runbooks — owner operational playbooks.

create table if not exists public.nexus_runbooks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (
    category in ('infrastructure', 'user_workflows', 'revenue', 'growth', 'security', 'operations')
  ),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  description text not null,
  trigger_types text[] not null default '{}',
  checklist jsonb not null default '[]'::jsonb,
  resolution_steps jsonb not null default '[]'::jsonb,
  verification_steps jsonb not null default '[]'::jsonb,
  owner_notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nexus_runbooks_category_status_idx
  on public.nexus_runbooks (category, status, updated_at desc);

create index if not exists nexus_runbooks_trigger_types_idx
  on public.nexus_runbooks using gin (trigger_types);

drop trigger if exists touch_nexus_runbooks_updated_at on public.nexus_runbooks;
create trigger touch_nexus_runbooks_updated_at
before update on public.nexus_runbooks
for each row execute function public.touch_updated_at();

alter table public.nexus_runbooks enable row level security;
revoke all on table public.nexus_runbooks from anon;
grant select, insert, update, delete on table public.nexus_runbooks to authenticated;
grant all on table public.nexus_runbooks to service_role;

drop policy if exists "Nexus owner reads runbooks" on public.nexus_runbooks;
create policy "Nexus owner reads runbooks"
on public.nexus_runbooks for select to authenticated
using (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner inserts runbooks" on public.nexus_runbooks;
create policy "Nexus owner inserts runbooks"
on public.nexus_runbooks for insert to authenticated
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner updates runbooks" on public.nexus_runbooks;
create policy "Nexus owner updates runbooks"
on public.nexus_runbooks for update to authenticated
using (public.is_platform_owner(auth.uid()))
with check (public.is_platform_owner(auth.uid()));

drop policy if exists "Nexus owner deletes runbooks" on public.nexus_runbooks;
create policy "Nexus owner deletes runbooks"
on public.nexus_runbooks for delete to authenticated
using (public.is_platform_owner(auth.uid()));

-- Starter runbooks (idempotent via slug)
insert into public.nexus_runbooks (
  slug, title, category, severity, description, trigger_types, checklist, resolution_steps, verification_steps, metadata
) values
(
  'infrastructure-recovery',
  'Infrastructure Recovery',
  'infrastructure',
  'critical',
  'Restore platform infrastructure when integrations or core services are degraded or down.',
  array['category:infra', 'category:health', 'integration:supabase', 'integration:vercel', 'integration:github', 'integration:resend', 'integration:crimson_society', 'severity:critical', 'severity:warning', 'rule:health.integration.down'],
  '[
    {"id":"infra-1","title":"Confirm affected integration","description":"Identify which integration probes are failing in Nexus Infrastructure."},
    {"id":"infra-2","title":"Check provider status pages","description":"Review Supabase, Vercel, Stripe, GitHub, and Resend status dashboards."},
    {"id":"infra-3","title":"Review recent deployments","description":"Check if a deployment coincides with the degradation window."},
    {"id":"infra-4","title":"Inspect Nexus health events","description":"Scan recent infra events and linked alerts for error patterns."}
  ]'::jsonb,
  '[
    {"id":"infra-r1","title":"Stabilize configuration","description":"Verify environment variables and integration tokens are present and valid."},
    {"id":"infra-r2","title":"Rollback or redeploy","description":"If deployment-related, rollback or redeploy the last known good release."},
    {"id":"infra-r3","title":"Restart affected collectors","description":"Trigger health-check cron or wait for the next probe cycle after fixes."},
    {"id":"infra-r4","title":"Document root cause","description":"Record impact summary and root cause in the linked incident or war room."}
  ]'::jsonb,
  '[
    {"id":"infra-v1","title":"Integration probes healthy","description":"All critical integrations return healthy in Nexus Infrastructure."},
    {"id":"infra-v2","title":"No new critical alerts","description":"No new critical infra alerts for 15 minutes."},
    {"id":"infra-v3","title":"User workflows recovering","description":"Workflow health score trends back above degraded threshold."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'user-workflow-recovery',
  'User Workflow Recovery',
  'user_workflows',
  'critical',
  'Diagnose and restore degraded user-facing workflows such as login, posting, meets, and messaging.',
  array['category:mission', 'workflow:user_login', 'workflow:user_signup', 'workflow:profile_setup', 'workflow:post_creation', 'workflow:media_upload', 'severity:critical', 'severity:warning', 'rule:mission.score.critical'],
  '[
    {"id":"wf-1","title":"Identify degraded workflows","description":"Open User Workflows and list workflows below healthy threshold."},
    {"id":"wf-2","title":"Correlate with infrastructure","description":"Check if infra degradation explains workflow failures."},
    {"id":"wf-3","title":"Review failure counts","description":"Inspect 1h failure counts and recent mission-health events."},
    {"id":"wf-4","title":"Check auth and database","description":"Verify Supabase auth and database availability."}
  ]'::jsonb,
  '[
    {"id":"wf-r1","title":"Fix upstream dependency","description":"Resolve infra or third-party issues blocking workflows first."},
    {"id":"wf-r2","title":"Patch application errors","description":"Deploy fixes for workflow-specific failures if code-related."},
    {"id":"wf-r3","title":"Clear blocking state","description":"Resolve rate limits, RLS issues, or config flags affecting flows."},
    {"id":"wf-r4","title":"Monitor recovery","description":"Watch workflow scores for 30 minutes after fix."}
  ]'::jsonb,
  '[
    {"id":"wf-v1","title":"Workflow scores healthy","description":"Degraded workflows return to healthy status."},
    {"id":"wf-v2","title":"Mission score stable","description":"Workflow Health Score remains above 80."},
    {"id":"wf-v3","title":"No new workflow alerts","description":"No new mission-category alerts during verification window."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'stripe-billing',
  'Stripe & Billing',
  'revenue',
  'critical',
  'Investigate Stripe webhook failures, checkout issues, and billing disruptions.',
  array['category:commerce', 'category:revenue', 'integration:stripe', 'workflow:stripe_webhook_processing', 'workflow:blackcard_purchase', 'rule:commerce.stripe.webhook', 'severity:critical', 'severity:warning'],
  '[
    {"id":"bill-1","title":"Check Stripe dashboard","description":"Review failed payments, webhook delivery, and API errors."},
    {"id":"bill-2","title":"Verify webhook endpoint","description":"Confirm production webhook URL and signing secret configuration."},
    {"id":"bill-3","title":"Inspect recent checkout sessions","description":"Review failed or incomplete checkout attempts in Stripe."},
    {"id":"bill-4","title":"Check Blackcard purchase workflow","description":"Review blackcard_purchase workflow health in Nexus."}
  ]'::jsonb,
  '[
    {"id":"bill-r1","title":"Replay failed webhooks","description":"Replay or manually reconcile failed Stripe webhook events."},
    {"id":"bill-r2","title":"Fix endpoint or secret","description":"Correct webhook URL, signing secret, or deployment routing."},
    {"id":"bill-r3","title":"Reconcile member state","description":"Verify affected members have correct membership after fix."}
  ]'::jsonb,
  '[
    {"id":"bill-v1","title":"Webhooks delivering","description":"Stripe webhook processing workflow returns healthy."},
    {"id":"bill-v2","title":"Test checkout","description":"Complete a test checkout in staging or controlled production test."},
    {"id":"bill-v3","title":"MRR stable","description":"No unexplained revenue drop in Nexus Metrics."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'messaging-recovery',
  'Messaging Recovery',
  'user_workflows',
  'warning',
  'Restore direct messaging when send, delivery, or inbox flows are degraded.',
  array['workflow:messaging', 'category:mission', 'severity:warning', 'severity:critical'],
  '[
    {"id":"msg-1","title":"Confirm messaging workflow status","description":"Check messaging workflow score and failure rate."},
    {"id":"msg-2","title":"Check Supabase realtime","description":"Verify database and realtime channels are operational."},
    {"id":"msg-3","title":"Review media upload path","description":"If media messages fail, check media_upload workflow too."}
  ]'::jsonb,
  '[
    {"id":"msg-r1","title":"Fix database or RLS issues","description":"Resolve permission or policy errors blocking message writes."},
    {"id":"msg-r2","title":"Restore media pipeline","description":"Fix storage or media API if attachments are failing."},
    {"id":"msg-r3","title":"Deploy messaging fix","description":"Ship patch if application-level bug identified."}
  ]'::jsonb,
  '[
    {"id":"msg-v1","title":"Send test messages","description":"Send DM between two test accounts successfully."},
    {"id":"msg-v2","title":"Messaging workflow healthy","description":"Messaging workflow returns to healthy status."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'meet-creation-recovery',
  'Meet Creation Recovery',
  'user_workflows',
  'warning',
  'Diagnose meet creation and joining failures affecting rider coordination.',
  array['workflow:meet_creation', 'workflow:meet_joining', 'category:mission', 'severity:warning', 'severity:critical'],
  '[
    {"id":"meet-1","title":"Check meet workflows","description":"Review meet_creation and meet_joining workflow scores."},
    {"id":"meet-2","title":"Inspect recent meet errors","description":"Look for meet-related alerts and events."},
    {"id":"meet-3","title":"Verify map and location services","description":"Confirm location APIs and ride tracking dependencies."}
  ]'::jsonb,
  '[
    {"id":"meet-r1","title":"Fix data constraints","description":"Resolve validation, RLS, or schema issues blocking meets."},
    {"id":"meet-r2","title":"Clear stuck rides","description":"Address orphaned ride records if blocking creation."},
    {"id":"meet-r3","title":"Deploy meet fix","description":"Ship targeted fix for identified meet flow bug."}
  ]'::jsonb,
  '[
    {"id":"meet-v1","title":"Create test meet","description":"Successfully create and join a test meet."},
    {"id":"meet-v2","title":"Workflows healthy","description":"Meet workflows return to healthy status."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'push-notification-recovery',
  'Push Notification Recovery',
  'user_workflows',
  'warning',
  'Restore push notification delivery when dispatch or registration fails.',
  array['workflow:push_notification_delivery', 'category:mission', 'severity:warning', 'severity:critical'],
  '[
    {"id":"push-1","title":"Check push workflow","description":"Review push_notification_delivery workflow health."},
    {"id":"push-2","title":"Verify Firebase config","description":"Confirm push credentials and Firebase project configuration."},
    {"id":"push-3","title":"Inspect dispatch cron","description":"Check push-dispatch cron logs and recent job failures."}
  ]'::jsonb,
  '[
    {"id":"push-r1","title":"Fix credentials","description":"Update invalid or expired push service credentials."},
    {"id":"push-r2","title":"Clear token backlog","description":"Resolve stuck dispatch jobs or invalid device tokens."},
    {"id":"push-r3","title":"Redeploy push handler","description":"Deploy fix if handler code is failing."}
  ]'::jsonb,
  '[
    {"id":"push-v1","title":"Test push delivery","description":"Send test notification to owner device."},
    {"id":"push-v2","title":"Push workflow healthy","description":"Push notification workflow returns healthy."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'revenue-investigation',
  'Revenue Investigation',
  'revenue',
  'warning',
  'Investigate MRR decline, checkout drop-off, or billing anomalies.',
  array['category:revenue', 'category:commerce', 'severity:warning', 'insight:revenue'],
  '[
    {"id":"rev-1","title":"Compare MRR trend","description":"Review estimated MRR and ARR in Nexus Metrics."},
    {"id":"rev-2","title":"Check Blackcard members","description":"Verify active Blackcard member count changes."},
    {"id":"rev-3","title":"Correlate with Stripe","description":"Cross-check Stripe dashboard with Nexus revenue metrics."},
    {"id":"rev-4","title":"Review billing alerts","description":"Check commerce and revenue-category alerts."}
  ]'::jsonb,
  '[
    {"id":"rev-r1","title":"Identify churn cause","description":"Determine cancellations, failed renewals, or pricing issues."},
    {"id":"rev-r2","title":"Fix billing blockers","description":"Resolve checkout or webhook issues preventing revenue."},
    {"id":"rev-r3","title":"Communicate if needed","description":"Prepare owner communication if member-facing billing issue."}
  ]'::jsonb,
  '[
    {"id":"rev-v1","title":"MRR trend stabilizes","description":"MRR holds or recovers over next rollup period."},
    {"id":"rev-v2","title":"Checkout flow healthy","description":"Blackcard purchase workflow remains healthy."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'growth-investigation',
  'Growth Investigation',
  'growth',
  'info',
  'Investigate user growth slowdown, signup drop-off, or onboarding friction.',
  array['category:growth', 'workflow:user_signup', 'workflow:profile_setup', 'severity:info', 'severity:warning', 'insight:growth'],
  '[
    {"id":"growth-1","title":"Review user metrics","description":"Check total users and new users this week in Nexus Metrics."},
    {"id":"growth-2","title":"Check signup workflow","description":"Review user_signup and profile_setup workflow health."},
    {"id":"growth-3","title":"Inspect invite funnel","description":"Verify invite-only gates are not blocking legitimate signups."}
  ]'::jsonb,
  '[
    {"id":"growth-r1","title":"Fix onboarding blockers","description":"Resolve signup, email, or profile setup failures."},
    {"id":"growth-r2","title":"Review access policy","description":"Confirm invite and membership policies match intent."},
    {"id":"growth-r3","title":"Monitor recovery","description":"Track new user counts over the next week."}
  ]'::jsonb,
  '[
    {"id":"growth-v1","title":"Signup workflow healthy","description":"Signup and profile workflows return healthy."},
    {"id":"growth-v2","title":"New users trending up","description":"Weekly new user count stabilizes or improves."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'incident-resolution',
  'Incident Resolution',
  'operations',
  'critical',
  'Structured playbook for resolving Nexus incidents from triage through postmortem.',
  array['context:incident', 'severity:critical', 'severity:warning', 'category:infra', 'category:mission'],
  '[
    {"id":"inc-1","title":"Assess severity and impact","description":"Review incident impact score, linked alerts, and affected systems."},
    {"id":"inc-2","title":"Assign investigation status","description":"Move incident to investigating and document initial findings."},
    {"id":"inc-3","title":"Apply relevant runbooks","description":"Open infrastructure or workflow runbooks matching the incident."},
    {"id":"inc-4","title":"Communicate status","description":"Add owner notes with current status and next actions."}
  ]'::jsonb,
  '[
    {"id":"inc-r1","title":"Mitigate user impact","description":"Apply fixes or workarounds to stop active degradation."},
    {"id":"inc-r2","title":"Mark mitigated","description":"Update incident status when impact is contained."},
    {"id":"inc-r3","title":"Resolve and document","description":"Record root cause, resolution, and verification evidence."}
  ]'::jsonb,
  '[
    {"id":"inc-v1","title":"Alerts resolved","description":"Linked alerts are resolved or suppressed appropriately."},
    {"id":"inc-v2","title":"Systems healthy","description":"Infrastructure and workflows show healthy status."},
    {"id":"inc-v3","title":"Incident closed","description":"Incident marked resolved with complete documentation."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
),
(
  'war-room-resolution',
  'War Room Resolution',
  'operations',
  'critical',
  'Command playbook for active war rooms coordinating serious incidents.',
  array['context:war_room', 'severity:critical', 'context:incident'],
  '[
    {"id":"wr-1","title":"Review war room timeline","description":"Scan merged timeline of events, alerts, and owner actions."},
    {"id":"wr-2","title":"Confirm linked signals","description":"Review linked alerts and insights in the war room."},
    {"id":"wr-3","title":"Compare snapshots","description":"Compare infrastructure and workflow snapshots at open vs current."},
    {"id":"wr-4","title":"Coordinate response","description":"Document decisions and assignments in owner notes."}
  ]'::jsonb,
  '[
    {"id":"wr-r1","title":"Execute recovery runbooks","description":"Apply infrastructure, workflow, or billing runbooks as needed."},
    {"id":"wr-r2","title":"Mark war room active","description":"Transition from open to active when response is underway."},
    {"id":"wr-r3","title":"Resolve war room","description":"Record resolution summary and mark war room resolved."}
  ]'::jsonb,
  '[
    {"id":"wr-v1","title":"Incident stabilized","description":"Underlying incident is mitigated or resolved."},
    {"id":"wr-v2","title":"Resolution documented","description":"War room resolution summary is complete."},
    {"id":"wr-v3","title":"Archive when done","description":"Archive war room after post-incident review."}
  ]'::jsonb,
  '{"is_seed": true}'::jsonb
)
on conflict (slug) do nothing;
