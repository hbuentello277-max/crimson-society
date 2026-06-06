/** Integration registry slugs (nexus_integrations). */
export const NEXUS_INTEGRATION_SLUGS = [
  "supabase",
  "stripe",
  "github",
  "vercel",
  "resend",
  "crimson_society",
] as const;

export type NexusIntegrationSlug = (typeof NEXUS_INTEGRATION_SLUGS)[number];

/** nexus_events.category values. */
export const NEXUS_EVENT_CATEGORIES = [
  "health",
  "deployment",
  "revenue",
  "growth",
  "security",
  "commerce",
  "infra",
  "mission",
] as const;

export type NexusEventCategory = (typeof NEXUS_EVENT_CATEGORIES)[number];

/** nexus_events.severity values. */
export const NEXUS_SEVERITY_LEVELS = ["info", "warning", "critical"] as const;

export type NexusSeverity = (typeof NEXUS_SEVERITY_LEVELS)[number];

/** nexus_events.source values. */
export const NEXUS_EVENT_SOURCES = [
  "collector",
  "webhook",
  "cron",
  "manual",
  "system",
] as const;

export type NexusEventSource = (typeof NEXUS_EVENT_SOURCES)[number];

/** nexus_alerts.status values. */
export const NEXUS_ALERT_STATUSES = [
  "active",
  "acknowledged",
  "resolved",
  "suppressed",
] as const;

export type NexusAlertStatus = (typeof NEXUS_ALERT_STATUSES)[number];

/** nexus_incidents.status values. */
export const NEXUS_INCIDENT_STATUSES = [
  "open",
  "investigating",
  "mitigated",
  "resolved",
  "postmortem",
] as const;

export type NexusIncidentStatus = (typeof NEXUS_INCIDENT_STATUSES)[number];

/** nexus_observations.status values. */
export const NEXUS_OBSERVATION_STATUSES = [
  "active",
  "superseded",
  "dismissed",
  "confirmed",
] as const;

export type NexusObservationStatus = (typeof NEXUS_OBSERVATION_STATUSES)[number];

/** nexus_commands.status values. */
export const NEXUS_COMMAND_STATUSES = [
  "suggested",
  "pending_approval",
  "approved",
  "rejected",
  "completed",
  "expired",
  "dismissed",
  "executing",
  "executed",
  "failed",
] as const;

export type NexusCommandStatus = (typeof NEXUS_COMMAND_STATUSES)[number];

/** nexus_mission_workflows.slug values. */
export const NEXUS_MISSION_WORKFLOW_SLUGS = [
  "user_signup",
  "user_login",
  "profile_setup",
  "post_creation",
  "meet_creation",
  "meet_joining",
  "messaging",
  "blackcard_purchase",
  "stripe_webhook_processing",
  "push_notification_delivery",
  "media_upload",
] as const;

export type NexusMissionWorkflowSlug = (typeof NEXUS_MISSION_WORKFLOW_SLUGS)[number];

/** nexus_activity_log.actor_type values. */
export const NEXUS_ACTOR_TYPES = ["owner", "system", "collector", "ai"] as const;

export type NexusActorType = (typeof NEXUS_ACTOR_TYPES)[number];

/** Default owner API rate limits (Mark I in-memory). */
export const NEXUS_OWNER_API_READ_LIMIT = 60;
export const NEXUS_OWNER_API_WRITE_LIMIT = 20;
export const NEXUS_OWNER_API_WINDOW_MS = 60_000;
