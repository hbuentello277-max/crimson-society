/** Scheduled NEXUS cron job registry (paths/schedules unchanged for backwards compatibility). */

export type NexusCronJobSlug =
  | "health_check"
  | "mission_health"
  | "metrics_rollup"
  | "alert_evaluation"
  | "observation_engine"
  | "command_suggestions"
  | "command_expiry";

export type NexusCronJobDefinition = {
  slug: NexusCronJobSlug;
  path: string;
  schedule: string;
  label: string;
  /** Primary activity-log action written by the cron handler. */
  activityAction: string;
  /** Legacy activity actions still queried for historical runs. */
  legacyActivityActions: string[];
  intervalMinutes: number;
};

export const NEXUS_CRON_JOBS: NexusCronJobDefinition[] = [
  {
    slug: "health_check",
    path: "/api/cron/nexus/health-check",
    schedule: "*/5 * * * *",
    label: "Infrastructure Check",
    activityAction: "nexus.cron.health_check.completed",
    legacyActivityActions: ["nexus.health_check.completed"],
    intervalMinutes: 5,
  },
  {
    slug: "mission_health",
    path: "/api/cron/nexus/mission-health",
    schedule: "2-57/5 * * * *",
    label: "Platform Health Check",
    activityAction: "nexus.cron.mission_health.completed",
    legacyActivityActions: ["nexus.mission_health.completed"],
    intervalMinutes: 5,
  },
  {
    slug: "metrics_rollup",
    path: "/api/cron/nexus/metrics-rollup",
    schedule: "5 * * * *",
    label: "Platform Metrics Rollup",
    activityAction: "nexus.cron.metrics_rollup.completed",
    legacyActivityActions: ["nexus.metrics_rollup.completed"],
    intervalMinutes: 60,
  },
  {
    slug: "alert_evaluation",
    path: "/api/cron/nexus/alert-evaluation",
    schedule: "*/10 * * * *",
    label: "Platform Alert Evaluation",
    activityAction: "nexus.cron.alert_evaluation.completed",
    legacyActivityActions: ["nexus.alert_evaluation.completed"],
    intervalMinutes: 10,
  },
  {
    slug: "observation_engine",
    path: "/api/cron/nexus/observation-engine",
    schedule: "*/15 * * * *",
    label: "Platform Insights Evaluation",
    activityAction: "nexus.cron.observation_engine.completed",
    legacyActivityActions: ["nexus.observation_evaluation.completed"],
    intervalMinutes: 15,
  },
  {
    slug: "command_suggestions",
    path: "/api/cron/nexus/command-suggestions",
    schedule: "35 * * * *",
    label: "Platform Command Suggestions",
    activityAction: "nexus.cron.command_suggestions.completed",
    legacyActivityActions: ["nexus.commands.generated"],
    intervalMinutes: 60,
  },
  {
    slug: "command_expiry",
    path: "/api/cron/nexus/command-expiry",
    schedule: "50 * * * *",
    label: "Platform Command Expiry",
    activityAction: "nexus.cron.command_expiry.completed",
    legacyActivityActions: ["nexus.commands.expiry.completed"],
    intervalMinutes: 60,
  },
];

export const NEXUS_CRON_JOB_BY_SLUG = Object.fromEntries(
  NEXUS_CRON_JOBS.map((job) => [job.slug, job]),
) as Record<NexusCronJobSlug, NexusCronJobDefinition>;

export function getNexusCronJobActions(job: NexusCronJobDefinition): string[] {
  return [job.activityAction, ...job.legacyActivityActions];
}
