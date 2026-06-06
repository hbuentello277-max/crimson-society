import { METRIC_KEYS } from "@/lib/metrics/types";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import { isSourceStale } from "@/lib/observations/context";
import { isoWeekKey } from "@/lib/observations/deduplication";
import { safeProbeDetails } from "@/lib/monitoring/redact";
import type {
  ObservationEvaluationContext,
  ObservationEvaluationOutcome,
  ObservationMatch,
  ObservationRule,
} from "@/lib/observations/types";

const MEMBER_BLOCKING_WORKFLOWS = ["user_login", "post_creation", "meet_creation", "messaging"];

const MRR_LOW_FLOOR = 500;

export const OBSERVATION_RULES: ObservationRule[] = [
  {
    rule_id: "obs.mission.health.diagnosis",
    name: "Mission Health Diagnosis",
    category: "mission",
    observation_type: "diagnosis",
    enabled: true,
  },
  {
    rule_id: "obs.infra.integration.diagnosis",
    name: "Integration Health Diagnosis",
    category: "infra",
    observation_type: "diagnosis",
    enabled: true,
  },
  {
    rule_id: "obs.revenue.blackcard.mrr.summary",
    name: "Blackcard MRR Summary",
    category: "revenue",
    observation_type: "summary",
    enabled: true,
  },
  {
    rule_id: "obs.growth.signups.trend",
    name: "Weekly Signups Trend",
    category: "growth",
    observation_type: "trend",
    enabled: true,
  },
  {
    rule_id: "obs.infra.incidents.clear.summary",
    name: "Critical Incidents Clear Summary",
    category: "infra",
    observation_type: "summary",
    enabled: true,
  },
];

function buildMatch(match: Omit<ObservationMatch, "rule"> & { rule: ObservationRule }): ObservationEvaluationOutcome {
  return {
    kind: "match",
    match: {
      ...match,
      evidence: safeProbeDetails(match.evidence),
    },
  };
}

function formatWorkflowList(slugs: string[], context: ObservationEvaluationContext): string {
  return slugs
    .map((slug) => context.mission.workflows[slug]?.display_name ?? slug)
    .join(", ");
}

function relatedMissionAlerts(context: ObservationEvaluationContext): ObservationMatch["alert_refs"] {
  return context.alerts.active
    .filter((alert) => alert.category === "mission" || alert.category === "health")
    .slice(0, 10)
    .map((alert) => ({ alert_id: alert.id, relationship: "related" as const }));
}

function relatedInfraAlerts(
  slug: string,
  context: ObservationEvaluationContext,
): ObservationMatch["alert_refs"] {
  return context.alerts.active
    .filter((alert) => alert.category === "infra" || alert.rule_id?.includes(slug))
    .slice(0, 5)
    .map((alert) => ({ alert_id: alert.id, relationship: "related" as const }));
}

function evaluateMissionHealthDiagnosis(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  if (context.mission.score === null || context.mission.status === null) {
    return [{ kind: "skipped", reason: "mission score unavailable" }];
  }

  if (context.mission.status === "healthy") {
    return [{ kind: "no_match" }];
  }

  const affected = [
    ...context.mission.failing_workflows,
    ...context.mission.warning_workflows,
  ].filter((slug, index, all) => all.indexOf(slug) === index);

  const memberBlockingAffected = affected.filter((slug) => MEMBER_BLOCKING_WORKFLOWS.includes(slug));
  const workflowList =
    memberBlockingAffected.length > 0
      ? formatWorkflowList(memberBlockingAffected, context)
      : formatWorkflowList(affected.slice(0, 4), context);

  const workflowState =
    context.mission.failing_workflows.length > 0 ? "failing" : "degraded";

  const stale = Object.values(context.mission.workflows).some((workflow) =>
    isSourceStale(workflow.last_check_at, context.evaluated_at),
  );

  const validUntil = new Date(
    new Date(context.evaluated_at).getTime() + 6 * 60 * 60_000,
  ).toISOString();

  return [
    buildMatch({
      rule,
      scope: "mission",
      scope_id: "mission.health",
      observation_type: rule.observation_type,
      category: rule.category,
      title: `Mission Health is ${context.mission.status}`,
      summary: `Mission Health is ${context.mission.status} because ${workflowList || "multiple workflows"} are ${workflowState}. Score: ${context.mission.score}.`,
      evidence: {
        mission_score: context.mission.score,
        mission_status: context.mission.status,
        warning_workflows: context.mission.warning_workflows,
        failing_workflows: context.mission.failing_workflows,
        member_blocking_affected: memberBlockingAffected,
      },
      confidence_inputs: {
        rule_class: "multi_workflow_diagnosis",
        complete_evidence: affected.length > 0,
        partial_evidence: affected.length === 0,
        agreeing_signals: affected.length,
        conflicting_signals: false,
        stale_data: stale,
        low_sample_size: false,
      },
      severity_inputs: {
        rule_id: rule.rule_id,
        mission_status: context.mission.status,
        failing_member_workflows: memberBlockingAffected.filter((slug) =>
          context.mission.failing_workflows.includes(slug),
        ).length,
        degraded_integrations: 0,
        open_critical_incidents: context.incidents.open_critical,
      },
      valid_until: validUntil,
      metric_refs: [],
      event_refs: [],
      alert_refs: relatedMissionAlerts(context),
    }),
  ];
}

function evaluateIntegrationDiagnosis(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  const outcomes: ObservationEvaluationOutcome[] = [];

  for (const slug of NEXUS_INTEGRATION_SLUGS) {
    const integration = context.integrations[slug];
    if (!integration) {
      continue;
    }

    const isBad = integration.status === "down" || integration.status === "degraded";
    const hasTokenIssue = integration.issues.some((issue) => /not set/i.test(issue));

    if (!isBad && !hasTokenIssue) {
      continue;
    }

    const reason =
      integration.issues.length > 0
        ? integration.issues.join("; ")
        : `integration status is ${integration.status}`;

    const validUntil = new Date(
      new Date(context.evaluated_at).getTime() + 6 * 60 * 60_000,
    ).toISOString();

    outcomes.push(
      buildMatch({
        rule,
        scope: "integration",
        scope_id: slug,
        observation_type: rule.observation_type,
        category: rule.category,
        title: `${slug} integration needs attention`,
        summary: `Nexus infra is impacted because ${slug} ${reason}.`,
        evidence: {
          integration_slug: slug,
          integration_status: integration.status,
          issues: integration.issues,
          last_check_at: integration.last_check_at,
        },
        confidence_inputs: {
          rule_class: "integration_probe",
          complete_evidence: integration.issues.length > 0 || isBad,
          partial_evidence: integration.issues.length === 0 && isBad,
          agreeing_signals: integration.issues.length,
          conflicting_signals: false,
          stale_data: isSourceStale(integration.last_check_at, context.evaluated_at),
          low_sample_size: false,
        },
        severity_inputs: {
          rule_id: rule.rule_id,
          mission_status: context.mission.status,
          failing_member_workflows: 0,
          degraded_integrations: Object.values(context.integrations).filter(
            (row) => row.status === "down" || row.status === "degraded",
          ).length,
          open_critical_incidents: context.incidents.open_critical,
        },
        valid_until: validUntil,
        metric_refs: [],
        event_refs: context.recent_events
          .filter((event) => event.event_type.includes(slug) || event.category === "infra")
          .slice(0, 3)
          .map((event, index) => ({
            event_id: event.id,
            relevance: index === 0 ? "primary" : "supporting",
          })),
        alert_refs: relatedInfraAlerts(slug, context),
      }),
    );
  }

  if (outcomes.length === 0) {
    return [{ kind: "no_match" }];
  }

  return outcomes;
}

function evaluateBlackcardMrrSummary(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  const members = context.metrics[METRIC_KEYS.BLACKCARD_ACTIVE];
  const mrr = context.metrics[METRIC_KEYS.REVENUE_MRR];

  if (!members || !mrr) {
    return [{ kind: "skipped", reason: "blackcard or MRR metrics unavailable" }];
  }

  const tier = mrr.value < MRR_LOW_FLOOR ? "below target" : "on track";
  const validUntil = new Date(
    new Date(context.evaluated_at).getTime() + 60 * 60_000,
  ).toISOString();

  return [
    buildMatch({
      rule,
      scope: "metric",
      scope_id: "revenue.blackcard_mrr",
      observation_type: rule.observation_type,
      category: rule.category,
      title: "Blackcard revenue snapshot",
      summary: `Blackcard revenue is active (${members.value} members) but current MRR is ${mrr.value} (${tier}).`,
      evidence: {
        active_members: members.value,
        mrr: mrr.value,
        mrr_previous: mrr.previous_value,
        tier,
        low_floor: MRR_LOW_FLOOR,
      },
      confidence_inputs: {
        rule_class: "revenue_summary",
        complete_evidence: true,
        partial_evidence: false,
        agreeing_signals: 2,
        conflicting_signals: members.value > 0 && mrr.value <= 0,
        stale_data: false,
        low_sample_size: false,
      },
      severity_inputs: {
        rule_id: rule.rule_id,
        mission_status: context.mission.status,
        failing_member_workflows: 0,
        degraded_integrations: 0,
        open_critical_incidents: context.incidents.open_critical,
      },
      valid_until: validUntil,
      metric_refs: [
        { snapshot_id: members.id, role: "current" },
        { snapshot_id: mrr.id, role: "comparison" },
      ],
      event_refs: [],
      alert_refs: context.alerts.active
        .filter((alert) => alert.category === "revenue")
        .slice(0, 5)
        .map((alert) => ({ alert_id: alert.id, relationship: "related" as const })),
    }),
  ];
}

function evaluateGrowthSignupsTrend(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  const weekly = context.metrics[METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY];
  if (!weekly) {
    return [{ kind: "skipped", reason: "weekly signups metric unavailable" }];
  }

  const history = context.metric_history[METRIC_KEYS.GROWTH_SIGNUPS_WEEKLY] ?? [];
  if (history.length < 2 && weekly.previous_value === null) {
    return [{ kind: "skipped", reason: "insufficient signup history for trend" }];
  }

  const previous =
    weekly.previous_value ??
    (history.length >= 2 ? history[1]?.value ?? null : null);

  if (previous === null) {
    return [{ kind: "skipped", reason: "prior week signups unavailable" }];
  }

  const delta = weekly.value - previous;
  const pct =
    previous === 0
      ? weekly.value > 0
        ? 100
        : 0
      : Math.round((delta / previous) * 1000) / 10;

  let direction: "improving" | "declining" | "flat" = "flat";
  if (pct > 2) {
    direction = "improving";
  } else if (pct < -2) {
    direction = "declining";
  }

  const directionLabel =
    direction === "improving"
      ? "improving"
      : direction === "declining"
        ? "declining"
        : "stable";

  const weekKey = isoWeekKey(new Date(context.evaluated_at));
  const validUntil = new Date(
    new Date(context.evaluated_at).getTime() + 7 * 24 * 60 * 60_000,
  ).toISOString();

  return [
    buildMatch({
      rule,
      scope: "week",
      scope_id: weekKey,
      observation_type: rule.observation_type,
      category: rule.category,
      title: `User growth is ${directionLabel} this week`,
      summary: `User growth is ${directionLabel} this week (${pct}% vs last week; ${weekly.value} signups vs ${previous}).`,
      evidence: {
        current_signups: weekly.value,
        previous_signups: previous,
        delta,
        delta_pct: pct,
        direction,
        week: weekKey,
      },
      confidence_inputs: {
        rule_class: "metric_trend",
        complete_evidence: true,
        partial_evidence: false,
        agreeing_signals: history.length >= 3 ? 3 : 1,
        conflicting_signals: false,
        stale_data: false,
        low_sample_size: history.length < 3,
      },
      severity_inputs: {
        rule_id: rule.rule_id,
        mission_status: context.mission.status,
        failing_member_workflows: 0,
        degraded_integrations: 0,
        open_critical_incidents: context.incidents.open_critical,
        trend_direction: direction,
      },
      valid_until: validUntil,
      metric_refs: [{ snapshot_id: weekly.id, role: "current" }],
      event_refs: [],
      alert_refs: [],
    }),
  ];
}

function evaluateIncidentsClearSummary(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  if (context.incidents.open_critical > 0) {
    return [{ kind: "no_match" }];
  }

  const validUntil = new Date(
    new Date(context.evaluated_at).getTime() + 60 * 60_000,
  ).toISOString();

  return [
    buildMatch({
      rule,
      scope: "global",
      scope_id: "none",
      observation_type: rule.observation_type,
      category: rule.category,
      title: "No critical incidents open",
      summary: "No current critical incidents exist.",
      evidence: {
        open_critical: context.incidents.open_critical,
        open_total: context.incidents.open_total,
        open_incident_ids: context.incidents.open_ids,
      },
      confidence_inputs: {
        rule_class: "absence_summary",
        complete_evidence: true,
        partial_evidence: false,
        agreeing_signals: 1,
        conflicting_signals: false,
        stale_data: false,
        low_sample_size: false,
        base_confidence: 0.97,
      },
      severity_inputs: {
        rule_id: rule.rule_id,
        mission_status: context.mission.status,
        failing_member_workflows: 0,
        degraded_integrations: 0,
        open_critical_incidents: context.incidents.open_critical,
        is_absence_summary: true,
      },
      valid_until: validUntil,
      metric_refs: [],
      event_refs: [],
      alert_refs: [],
    }),
  ];
}

export function evaluateObservationRule(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  if (!rule.enabled) {
    return [{ kind: "skipped", reason: "rule disabled" }];
  }

  switch (rule.rule_id) {
    case "obs.mission.health.diagnosis":
      return evaluateMissionHealthDiagnosis(rule, context);
    case "obs.infra.integration.diagnosis":
      return evaluateIntegrationDiagnosis(rule, context);
    case "obs.revenue.blackcard.mrr.summary":
      return evaluateBlackcardMrrSummary(rule, context);
    case "obs.growth.signups.trend":
      return evaluateGrowthSignupsTrend(rule, context);
    case "obs.infra.incidents.clear.summary":
      return evaluateIncidentsClearSummary(rule, context);
    default:
      return [{ kind: "skipped", reason: `unknown rule ${rule.rule_id}` }];
  }
}
