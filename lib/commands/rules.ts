import type { CommandSuggestionDraft } from "@/lib/commands/types";

const DEFAULT_EXPIRY_HOURS = 72;

function expiresAt(hours = DEFAULT_EXPIRY_HOURS) {
  return new Date(Date.now() + hours * 60 * 60_000).toISOString();
}

function runbookDraft(input: {
  slug: string;
  runbookId: string;
  title: string;
  summary: string;
  recommended_action: string;
  dedupe_key: string;
  risk_level?: CommandSuggestionDraft["risk_level"];
  evidence?: Record<string, unknown>;
  related_incident_id?: string | null;
  related_war_room_id?: string | null;
  related_observation_id?: string | null;
  related_alert_id?: string | null;
}): CommandSuggestionDraft {
  return {
    dedupe_key: input.dedupe_key,
    command_type: "follow_runbook",
    title: input.title,
    summary: input.summary,
    risk_level: input.risk_level ?? "low",
    source: "system",
    recommended_action: input.recommended_action,
    evidence: input.evidence ?? { runbook_slug: input.slug },
    related_runbook_id: input.runbookId,
    related_incident_id: input.related_incident_id ?? null,
    related_war_room_id: input.related_war_room_id ?? null,
    related_observation_id: input.related_observation_id ?? null,
    related_alert_id: input.related_alert_id ?? null,
    expires_at: expiresAt(),
  };
}

export function buildInfrastructureCommandDrafts(input: {
  integrations: Array<{
    slug: string;
    display_name: string;
    status: string;
    error_message: string | null;
  }>;
  runbooksBySlug: Map<string, string>;
}): CommandSuggestionDraft[] {
  const drafts: CommandSuggestionDraft[] = [];

  for (const integration of input.integrations) {
    const degraded = ["down", "degraded", "failing", "error", "unknown"].includes(
      integration.status.toLowerCase(),
    );
    if (!degraded) {
      continue;
    }

    const error = (integration.error_message ?? "").toUpperCase();

    if (integration.slug === "github" && error.includes("GITHUB_TOKEN")) {
      drafts.push({
        dedupe_key: `infra:github-token:${integration.slug}`,
        command_type: "investigate_integration",
        title: "Investigate GitHub integration token",
        summary: "GitHub integration is degraded because GITHUB_TOKEN is not set.",
        risk_level: "medium",
        source: "system",
        recommended_action:
          "Verify GITHUB_TOKEN is configured in production environment variables and rerun health checks.",
        evidence: {
          integration_slug: integration.slug,
          error_message: integration.error_message,
        },
        expires_at: expiresAt(),
      });
    }

    if (integration.slug === "vercel" && error.includes("VERCEL_TOKEN")) {
      drafts.push({
        dedupe_key: `infra:vercel-token:${integration.slug}`,
        command_type: "investigate_integration",
        title: "Investigate Vercel integration token",
        summary: "Vercel integration is degraded because VERCEL_TOKEN is not set.",
        risk_level: "medium",
        source: "system",
        recommended_action:
          "Verify VERCEL_TOKEN is configured in production environment variables and rerun health checks.",
        evidence: {
          integration_slug: integration.slug,
          error_message: integration.error_message,
        },
        expires_at: expiresAt(),
      });
    }

    if (integration.slug === "supabase") {
      const runbookId = input.runbooksBySlug.get("infrastructure-recovery");
      drafts.push({
        dedupe_key: `infra:supabase-health:${integration.slug}`,
        command_type: "review_infrastructure",
        title: "Review Supabase health checks",
        summary: "Supabase integration is degraded. Review infrastructure health and recovery steps.",
        risk_level: "high",
        source: "system",
        recommended_action:
          "Open Infrastructure in Nexus, review Supabase probe results, and follow the Infrastructure Recovery runbook.",
        evidence: {
          integration_slug: integration.slug,
          error_message: integration.error_message,
          status: integration.status,
        },
        related_runbook_id: runbookId ?? null,
        expires_at: expiresAt(),
      });

      if (runbookId) {
        drafts.push(
          runbookDraft({
            slug: "infrastructure-recovery",
            runbookId,
            title: "Follow Infrastructure Recovery runbook",
            summary: "Supabase degradation detected. Use the Infrastructure Recovery playbook.",
            recommended_action: "Open the Infrastructure Recovery runbook and work through the checklist.",
            dedupe_key: `runbook:infrastructure-recovery:supabase`,
            risk_level: "low",
            evidence: { integration_slug: integration.slug },
          }),
        );
      }
    }
  }

  return drafts;
}

export function buildWorkflowCommandDrafts(input: {
  missionStatus: string;
  workflows: Array<{
    slug: string;
    display_name: string;
    workflow_status: string;
  }>;
  runbooksBySlug: Map<string, string>;
}): CommandSuggestionDraft[] {
  const drafts: CommandSuggestionDraft[] = [];
  const degraded = input.workflows.filter((wf) =>
    ["degraded", "impaired", "critical", "failing"].includes(wf.workflow_status.toLowerCase()),
  );

  if (
    ["degraded", "impaired", "critical", "failing", "warning"].includes(
      input.missionStatus.toLowerCase(),
    ) ||
    degraded.length > 0
  ) {
    const workflowRunbook = input.runbooksBySlug.get("user-workflow-recovery");
    drafts.push({
      dedupe_key: "workflows:review-degraded",
      command_type: "review_workflows",
      title: "Review degraded user workflows",
      summary: "User Workflows are degraded. Review affected workflow scores and failure patterns.",
      risk_level: "medium",
      source: "system",
      recommended_action:
        "Open User Workflows in Nexus and inspect degraded workflow checks and recent failures.",
      evidence: {
        mission_status: input.missionStatus,
        degraded_workflows: degraded.map((wf) => wf.slug),
      },
      related_runbook_id: workflowRunbook ?? null,
      expires_at: expiresAt(),
    });

    if (workflowRunbook) {
      drafts.push(
        runbookDraft({
          slug: "user-workflow-recovery",
          runbookId: workflowRunbook,
          title: "Follow User Workflow Recovery runbook",
          summary: "Workflow degradation detected. Use the User Workflow Recovery playbook.",
          recommended_action: "Open the User Workflow Recovery runbook and complete the checklist.",
          dedupe_key: "runbook:user-workflow-recovery",
          risk_level: "low",
          evidence: { degraded_workflows: degraded.map((wf) => wf.slug) },
        }),
      );
    }
  }

  for (const wf of degraded) {
    if (wf.slug === "meet_creation" || wf.slug === "meet_joining") {
      const runbookId = input.runbooksBySlug.get("meet-creation-recovery");
      drafts.push({
        dedupe_key: `workflow:meet:${wf.slug}`,
        command_type: "review_workflow",
        title: "Review meet creation workflow",
        summary: `${wf.display_name} is degraded. Review meet creation and joining reliability.`,
        risk_level: "medium",
        source: "system",
        recommended_action:
          "Inspect meet creation/joining workflow checks and follow the Meet Creation Recovery runbook.",
        evidence: { workflow_slug: wf.slug, workflow_status: wf.workflow_status },
        related_runbook_id: runbookId ?? null,
        expires_at: expiresAt(),
      });
    }

    if (wf.slug === "messaging") {
      const runbookId = input.runbooksBySlug.get("messaging-recovery");
      drafts.push({
        dedupe_key: "workflow:messaging",
        command_type: "review_workflow",
        title: "Review messaging workflow",
        summary: "Messaging workflow is degraded. Review direct message delivery failures.",
        risk_level: "medium",
        source: "system",
        recommended_action:
          "Inspect messaging workflow checks and follow the Messaging Recovery runbook.",
        evidence: { workflow_slug: wf.slug, workflow_status: wf.workflow_status },
        related_runbook_id: runbookId ?? null,
        expires_at: expiresAt(),
      });
    }

    if (wf.slug === "stripe_webhook_processing") {
      const runbookId = input.runbooksBySlug.get("stripe-billing");
      drafts.push({
        dedupe_key: "workflow:stripe-webhook",
        command_type: "review_billing",
        title: "Review failed Stripe webhooks",
        summary: "Stripe webhook processing workflow is degraded.",
        risk_level: "high",
        source: "system",
        recommended_action:
          "Review Stripe dashboard webhook delivery and follow the Stripe & Billing runbook.",
        evidence: { workflow_slug: wf.slug, workflow_status: wf.workflow_status },
        related_runbook_id: runbookId ?? null,
        expires_at: expiresAt(),
      });
    }
  }

  return drafts;
}

export function buildAlertCommandDrafts(input: {
  alerts: Array<{
    id: string;
    title: string;
    severity: string;
    category: string;
    rule_id: string | null;
  }>;
}): CommandSuggestionDraft[] {
  const drafts: CommandSuggestionDraft[] = [];

  for (const alert of input.alerts) {
    if (alert.severity !== "critical") {
      continue;
    }

    drafts.push({
      dedupe_key: `alert:critical:${alert.id}`,
      command_type: "review_alert",
      title: "Review critical alert",
      summary: `Critical alert active: ${alert.title}`,
      risk_level: "high",
      source: "alert",
      recommended_action:
        "Open the alert in Nexus Alerts, acknowledge investigation, and follow related runbooks if available.",
      evidence: {
        alert_id: alert.id,
        category: alert.category,
        rule_id: alert.rule_id,
      },
      related_alert_id: alert.id,
      expires_at: expiresAt(48),
    });
  }

  return drafts;
}

export function buildIncidentCommandDrafts(input: {
  incidents: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    impact_score: number;
  }>;
  warRoomByIncident: Map<string, string>;
  runbooksBySlug: Map<string, string>;
}): CommandSuggestionDraft[] {
  const drafts: CommandSuggestionDraft[] = [];

  for (const incident of input.incidents) {
    const open = ["open", "investigating", "mitigated"].includes(incident.status);
    if (open && (incident.severity === "critical" || incident.impact_score >= 75)) {
      if (!input.warRoomByIncident.has(incident.id)) {
        drafts.push({
          dedupe_key: `incident:war-room:${incident.id}`,
          command_type: "open_war_room",
          title: "Consider opening a war room",
          summary: `High-impact incident open: ${incident.title}`,
          risk_level: "high",
          source: "system",
          recommended_action:
            "Open Incidents in Nexus and create a war room for coordinated incident command.",
          evidence: {
            incident_id: incident.id,
            impact_score: incident.impact_score,
            severity: incident.severity,
          },
          related_incident_id: incident.id,
          expires_at: expiresAt(48),
        });
      }
    }

    if (["resolved", "postmortem"].includes(incident.status)) {
      const runbookId = input.runbooksBySlug.get("incident-resolution");
      drafts.push({
        dedupe_key: `incident:postmortem:${incident.id}`,
        command_type: "create_postmortem",
        title: "Create incident postmortem draft",
        summary: `Incident resolved: ${incident.title}. Document postmortem notes.`,
        risk_level: "low",
        source: "system",
        recommended_action:
          "Draft a postmortem summary with root cause, timeline, and follow-up actions.",
        evidence: { incident_id: incident.id, status: incident.status },
        related_incident_id: incident.id,
        related_runbook_id: runbookId ?? null,
        expires_at: expiresAt(168),
      });
    }
  }

  return drafts;
}

export function buildObservationCommandDrafts(input: {
  observations: Array<{
    id: string;
    title: string;
    summary: string;
    category: string;
    severity: string;
    rule_id?: string | null;
    metadata?: Record<string, unknown>;
  }>;
  runbooksBySlug: Map<string, string>;
}): CommandSuggestionDraft[] {
  const drafts: CommandSuggestionDraft[] = [];

  for (const observation of input.observations) {
    if (!["warning", "critical"].includes(observation.severity)) {
      continue;
    }

    const haystack = `${observation.title} ${observation.summary}`.toLowerCase();
    const metadataDedupeKey =
      typeof observation.metadata?.dedupe_key === "string" ? observation.metadata.dedupe_key : null;
    const evidenceKey = metadataDedupeKey ?? observation.rule_id ?? observation.id;

    if (
      observation.category === "revenue" ||
      observation.category === "commerce" ||
      haystack.includes("revenue") ||
      haystack.includes("mrr")
    ) {
      const runbookId = input.runbooksBySlug.get("revenue-investigation");
      drafts.push({
        dedupe_key: `observation:revenue:${evidenceKey}`,
        command_type: "review_revenue",
        title: "Review revenue investigation runbook",
        summary: "Revenue decline insight detected. Investigate billing and revenue metrics.",
        risk_level: "medium",
        source: "observation",
        recommended_action: "Open the Revenue Investigation runbook and review MRR trends.",
        evidence: { observation_id: observation.id, category: observation.category },
        related_observation_id: observation.id,
        related_runbook_id: runbookId ?? null,
        expires_at: expiresAt(),
      });
    }

    if (
      observation.category === "growth" ||
      haystack.includes("growth") ||
      haystack.includes("signup")
    ) {
      const runbookId = input.runbooksBySlug.get("growth-investigation");
      drafts.push({
        dedupe_key: `observation:growth:${evidenceKey}`,
        command_type: "review_growth",
        title: "Review growth investigation runbook",
        summary: "Growth slowdown insight detected. Review signup and onboarding funnel health.",
        risk_level: "low",
        source: "observation",
        recommended_action: "Open the Growth Investigation runbook and inspect user growth metrics.",
        evidence: { observation_id: observation.id, category: observation.category },
        related_observation_id: observation.id,
        related_runbook_id: runbookId ?? null,
        expires_at: expiresAt(),
      });
    }

    if (
      observation.category === "infra" ||
      observation.category === "health" ||
      haystack.includes("infrastructure")
    ) {
      const runbookId = input.runbooksBySlug.get("infrastructure-recovery");
      drafts.push({
        dedupe_key: `observation:infra:${evidenceKey}`,
        command_type: "follow_runbook",
        title: "Follow Infrastructure Recovery runbook",
        summary: "Infrastructure insight detected. Follow the infrastructure recovery playbook.",
        risk_level: "medium",
        source: "observation",
        recommended_action: "Open the Infrastructure Recovery runbook and work through the checklist.",
        evidence: { observation_id: observation.id, category: observation.category },
        related_observation_id: observation.id,
        related_runbook_id: runbookId ?? null,
        expires_at: expiresAt(),
      });
    }
  }

  return drafts;
}

export function buildWarRoomCommandDrafts(input: {
  warRooms: Array<{ id: string; title: string; incident_id: string }>;
  runbooksBySlug: Map<string, string>;
}): CommandSuggestionDraft[] {
  const drafts: CommandSuggestionDraft[] = [];
  const runbookId = input.runbooksBySlug.get("war-room-resolution");

  for (const room of input.warRooms) {
    drafts.push({
      dedupe_key: `war-room:resolution:${room.id}`,
      command_type: "war_room_resolution",
      title: "Follow War Room Resolution runbook",
      summary: `Active war room: ${room.title}`,
      risk_level: "medium",
      source: "system",
      recommended_action:
        "Open the war room, follow the War Room Resolution runbook, and document owner notes.",
      evidence: { war_room_id: room.id, incident_id: room.incident_id },
      related_war_room_id: room.id,
      related_incident_id: room.incident_id,
      related_runbook_id: runbookId ?? null,
      expires_at: expiresAt(),
    });
  }

  return drafts;
}

export function buildWeeklySummaryCommand(): CommandSuggestionDraft {
  return {
    dedupe_key: `ops:weekly-summary:${new Date().toISOString().slice(0, 10)}`,
    command_type: "weekly_summary",
    title: "Generate weekly operational summary",
    summary: "Compile a weekly snapshot of infrastructure, workflows, revenue, and incidents.",
    risk_level: "low",
    source: "system",
    recommended_action:
      "Review Nexus Metrics, Alerts, Incidents, and Insights to draft a weekly operational summary.",
    evidence: { period: "weekly" },
    expires_at: expiresAt(168),
  };
}
