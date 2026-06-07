import { METRIC_KEYS } from "@/lib/metrics/types";
import type {
  ObservationEvaluationContext,
  ObservationEvaluationOutcome,
  ObservationMatch,
  ObservationRule,
} from "@/lib/observations/types";
import { safeProbeDetails } from "@/lib/monitoring/redact";

const DEPLOY_CORRELATION_WINDOW_MS = 2 * 60 * 60_000;
const DEPLOY_CORRELATION_THRESHOLD_PCT = 12;
const REGRESSION_THRESHOLD_PCT = 15;
const REVENUE_DECLINE_THRESHOLD_PCT = 5;
const ANOMALY_SPIKE_MULTIPLIER = 3;
const ANOMALY_MIN_VALUE = 5;

const MILESTONE_THRESHOLDS = [100, 250, 500, 1000, 2500, 5000, 10000];

const DEPLOY_WATCH_METRICS = [
  METRIC_KEYS.REVENUE_MRR,
  METRIC_KEYS.GROWTH_SIGNUPS_DAILY,
  METRIC_KEYS.ACTIVITY_POSTS_DAILY,
  METRIC_KEYS.ACTIVITY_MEETS_DAILY,
] as const;

function buildMatch(
  match: Omit<ObservationMatch, "rule"> & { rule: ObservationRule },
): ObservationEvaluationOutcome {
  return {
    kind: "match",
    match: {
      ...match,
      evidence: safeProbeDetails(match.evidence),
    },
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentDelta(current: number, baseline: number): number {
  if (baseline === 0) {
    return current === 0 ? 0 : 100;
  }

  return Math.round(((current - baseline) / baseline) * 1000) / 10;
}

function deploymentEventRefs(
  context: ObservationEvaluationContext,
  deploymentId: string,
): ObservationMatch["event_refs"] {
  return context.recent_events
    .filter(
      (event) =>
        event.event_type.includes("deploy") ||
        event.category === "deployment",
    )
    .slice(0, 3)
    .map((event, index) => ({
      event_id: event.id,
      relevance: index === 0 ? ("primary" as const) : ("supporting" as const),
    }));
}

export function evaluateDeployCorrelation(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  const deployment = context.latest_deployment;
  if (!deployment) {
    return [{ kind: "skipped", reason: "no recent deployment" }];
  }

  if (deployment.environment !== "production" || deployment.status !== "ready") {
    return [{ kind: "no_match" }];
  }

  const deployAgeMs =
    new Date(context.evaluated_at).getTime() - new Date(deployment.started_at).getTime();
  if (deployAgeMs > DEPLOY_CORRELATION_WINDOW_MS) {
    return [{ kind: "no_match" }];
  }

  const outcomes: ObservationEvaluationOutcome[] = [];

  for (const metricKey of DEPLOY_WATCH_METRICS) {
    const snapshot = context.metrics[metricKey];
    const history = context.metric_history[metricKey] ?? [];
    if (!snapshot || history.length < 2) {
      continue;
    }

    const deployTime = new Date(deployment.started_at).getTime();
    const baselineValues = history
      .filter((point) => new Date(point.period_start).getTime() < deployTime)
      .slice(0, 6)
      .map((point) => point.value);

    const baseline = average(baselineValues) ?? snapshot.previous_value;
    if (baseline === null) {
      continue;
    }

    const deltaPct = percentDelta(snapshot.value, baseline);
    if (Math.abs(deltaPct) < DEPLOY_CORRELATION_THRESHOLD_PCT) {
      continue;
    }

    const sha = deployment.commit_sha?.slice(0, 7) ?? deployment.id.slice(0, 8);
    const validUntil = new Date(
      new Date(context.evaluated_at).getTime() + 6 * 60 * 60_000,
    ).toISOString();

    outcomes.push(
      buildMatch({
        rule,
        scope: "metric",
        scope_id: metricKey,
        observation_type: "correlation",
        category: "deployment",
        title: `${metricKey} shifted after deployment`,
        summary: `${metricKey} shifted ${deltaPct}% within 2h of deployment ${sha}.`,
        evidence: {
          metric_key: metricKey,
          delta_pct: deltaPct,
          current_value: snapshot.value,
          baseline_value: baseline,
          deployment_id: deployment.id,
          commit_sha: deployment.commit_sha,
          deployed_at: deployment.started_at,
        },
        confidence_inputs: {
          rule_class: "deploy_correlation",
          complete_evidence: Boolean(deployment.commit_sha),
          partial_evidence: !deployment.commit_sha,
          agreeing_signals: baselineValues.length >= 3 ? 3 : 1,
          conflicting_signals: false,
          stale_data: false,
          low_sample_size: baselineValues.length < 3,
        },
        severity_inputs: {
          rule_id: rule.rule_id,
          mission_status: context.mission.status,
          failing_member_workflows: 0,
          degraded_integrations: 0,
          open_critical_incidents: context.incidents.open_critical,
          metric_delta_pct: deltaPct,
        },
        valid_until: validUntil,
        metric_refs: [{ snapshot_id: snapshot.id, role: "current" }],
        event_refs: deploymentEventRefs(context, deployment.id),
        alert_refs: [],
      }),
    );
  }

  if (outcomes.length === 0) {
    return [{ kind: "no_match" }];
  }

  return outcomes;
}

export function evaluateRevenueDecline(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  const mrr = context.metrics[METRIC_KEYS.REVENUE_MRR];
  if (!mrr) {
    return [{ kind: "skipped", reason: "revenue.mrr metric unavailable" }];
  }

  const history = context.metric_history[METRIC_KEYS.REVENUE_MRR] ?? [];
  if (history.length < 3) {
    return [{ kind: "skipped", reason: "insufficient MRR history for regression" }];
  }

  const baseline = average(history.slice(0, 7).map((point) => point.value));
  if (baseline === null) {
    return [{ kind: "skipped", reason: "MRR baseline unavailable" }];
  }

  const deltaPct = percentDelta(mrr.value, baseline);
  if (deltaPct > -REVENUE_DECLINE_THRESHOLD_PCT) {
    return [{ kind: "no_match" }];
  }

  const validUntil = new Date(
    new Date(context.evaluated_at).getTime() + 24 * 60 * 60_000,
  ).toISOString();

  return [
    buildMatch({
      rule,
      scope: "metric",
      scope_id: METRIC_KEYS.REVENUE_MRR,
      observation_type: "regression",
      category: "revenue",
      title: "Revenue declined vs 7-day average",
      summary: `Revenue declined ${Math.abs(deltaPct)}% compared to the previous 7-day average (MRR ${mrr.value} vs avg ${Math.round(baseline)}).`,
      evidence: {
        metric_key: METRIC_KEYS.REVENUE_MRR,
        current_mrr: mrr.value,
        baseline_avg: baseline,
        delta_pct: deltaPct,
      },
      confidence_inputs: {
        rule_class: "regression",
        complete_evidence: history.length >= 7,
        partial_evidence: history.length < 7,
        agreeing_signals: history.length >= 5 ? 3 : 1,
        conflicting_signals: false,
        stale_data: false,
        low_sample_size: history.length < 5,
      },
      severity_inputs: {
        rule_id: rule.rule_id,
        mission_status: context.mission.status,
        failing_member_workflows: 0,
        degraded_integrations: 0,
        open_critical_incidents: context.incidents.open_critical,
        metric_delta_pct: deltaPct,
      },
      valid_until: validUntil,
      metric_refs: [{ snapshot_id: mrr.id, role: "current" }],
      event_refs: [],
      alert_refs: context.alerts.active
        .filter((alert) => alert.category === "revenue")
        .slice(0, 5)
        .map((alert) => ({ alert_id: alert.id, relationship: "related" as const })),
    }),
  ];
}

export function evaluateGrowthUsersMilestone(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  const totalUsers = context.metrics[METRIC_KEYS.GROWTH_TOTAL_USERS];
  if (!totalUsers) {
    return [{ kind: "skipped", reason: "growth.total_users metric unavailable" }];
  }

  const previous =
    totalUsers.previous_value ??
    (context.metric_history[METRIC_KEYS.GROWTH_TOTAL_USERS]?.[1]?.value ?? null);

  if (previous === null) {
    return [{ kind: "skipped", reason: "prior total users unavailable for milestone detection" }];
  }

  const crossed = MILESTONE_THRESHOLDS.filter(
    (threshold) => totalUsers.value >= threshold && previous < threshold,
  );

  if (crossed.length === 0) {
    return [{ kind: "no_match" }];
  }

  const milestone = crossed[crossed.length - 1]!;

  return [
    buildMatch({
      rule,
      scope: "milestone",
      scope_id: String(milestone),
      observation_type: "milestone",
      category: "growth",
      title: `Member milestone: ${milestone} total users`,
      summary: `Total registered users reached ${totalUsers.value}, crossing the ${milestone} member milestone.`,
      evidence: {
        milestone_threshold: milestone,
        current_total_users: totalUsers.value,
        previous_total_users: previous,
        all_crossed: crossed,
      },
      confidence_inputs: {
        rule_class: "milestone",
        complete_evidence: true,
        partial_evidence: false,
        agreeing_signals: 1,
        conflicting_signals: false,
        stale_data: false,
        low_sample_size: false,
        base_confidence: 0.98,
      },
      severity_inputs: {
        rule_id: rule.rule_id,
        mission_status: context.mission.status,
        failing_member_workflows: 0,
        degraded_integrations: 0,
        open_critical_incidents: context.incidents.open_critical,
        is_milestone: true,
      },
      valid_until: null,
      metric_refs: [{ snapshot_id: totalUsers.id, role: "current" }],
      event_refs: [],
      alert_refs: [],
    }),
  ];
}

export function evaluatePushFailedAnomaly(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  const current = context.metrics[METRIC_KEYS.ACTIVITY_PUSH_FAILED_DAILY];
  if (!current) {
    return [{ kind: "skipped", reason: "activity.push_failed_daily metric unavailable" }];
  }

  const history = context.metric_history[METRIC_KEYS.ACTIVITY_PUSH_FAILED_DAILY] ?? [];
  const baseline = average(history.slice(1, 8).map((point) => point.value));
  if (baseline === null || baseline <= 0) {
    return [{ kind: "skipped", reason: "push failure baseline unavailable" }];
  }

  if (current.value < ANOMALY_MIN_VALUE || current.value < baseline * ANOMALY_SPIKE_MULTIPLIER) {
    return [{ kind: "no_match" }];
  }

  const spikeRatio = Math.round((current.value / baseline) * 10) / 10;
  const validUntil = new Date(
    new Date(context.evaluated_at).getTime() + 24 * 60 * 60_000,
  ).toISOString();

  return [
    buildMatch({
      rule,
      scope: "metric",
      scope_id: METRIC_KEYS.ACTIVITY_PUSH_FAILED_DAILY,
      observation_type: "anomaly",
      category: "activity",
      title: "Push notification failures spiking",
      summary: `Daily push failures (${current.value}) are ${spikeRatio}× the recent baseline (${Math.round(baseline)}).`,
      evidence: {
        metric_key: METRIC_KEYS.ACTIVITY_PUSH_FAILED_DAILY,
        current_value: current.value,
        baseline_avg: baseline,
        spike_ratio: spikeRatio,
      },
      confidence_inputs: {
        rule_class: "anomaly",
        complete_evidence: history.length >= 5,
        partial_evidence: history.length < 5,
        agreeing_signals: history.length >= 3 ? 2 : 1,
        conflicting_signals: false,
        stale_data: false,
        low_sample_size: history.length < 5,
      },
      severity_inputs: {
        rule_id: rule.rule_id,
        mission_status: context.mission.status,
        failing_member_workflows: 0,
        degraded_integrations: 0,
        open_critical_incidents: context.incidents.open_critical,
        metric_delta_pct: percentDelta(current.value, baseline),
      },
      valid_until: validUntil,
      metric_refs: [{ snapshot_id: current.id, role: "current" }],
      event_refs: context.recent_events
        .filter((event) => event.event_type.includes("push"))
        .slice(0, 3)
        .map((event, index) => ({
          event_id: event.id,
          relevance: index === 0 ? ("primary" as const) : ("supporting" as const),
        })),
      alert_refs: [],
    }),
  ];
}

export function evaluateMissionHealthRegression(
  rule: ObservationRule,
  context: ObservationEvaluationContext,
): ObservationEvaluationOutcome[] {
  if (context.mission.score === null) {
    return [{ kind: "skipped", reason: "platform score unavailable" }];
  }

  if (context.prior_mission_score === null) {
    return [{ kind: "skipped", reason: "prior platform score unavailable for regression" }];
  }

  const deltaPct = percentDelta(context.mission.score, context.prior_mission_score);
  if (deltaPct > -REGRESSION_THRESHOLD_PCT) {
    return [{ kind: "no_match" }];
  }

  const validUntil = new Date(
    new Date(context.evaluated_at).getTime() + 6 * 60 * 60_000,
  ).toISOString();

  return [
    buildMatch({
      rule,
      scope: "mission",
      scope_id: "mission.health.regression",
      observation_type: "regression",
      category: "mission",
      title: "Platform Status regressed",
      summary: `Platform Status score dropped ${Math.abs(deltaPct)}% since the last diagnosis (${context.mission.score} vs ${context.prior_mission_score}).`,
      evidence: {
        current_score: context.mission.score,
        prior_score: context.prior_mission_score,
        delta_pct: deltaPct,
        mission_status: context.mission.status,
        failing_workflows: context.mission.failing_workflows,
        warning_workflows: context.mission.warning_workflows,
      },
      confidence_inputs: {
        rule_class: "regression",
        complete_evidence: true,
        partial_evidence: false,
        agreeing_signals:
          context.mission.failing_workflows.length + context.mission.warning_workflows.length,
        conflicting_signals: context.mission.status === "healthy",
        stale_data: false,
        low_sample_size: false,
      },
      severity_inputs: {
        rule_id: rule.rule_id,
        mission_status: context.mission.status,
        failing_member_workflows: context.mission.failing_workflows.length,
        degraded_integrations: 0,
        open_critical_incidents: context.incidents.open_critical,
        metric_delta_pct: deltaPct,
      },
      valid_until: validUntil,
      metric_refs: [],
      event_refs: [],
      alert_refs: context.alerts.active
        .filter((alert) => alert.category === "mission")
        .slice(0, 5)
        .map((alert) => ({ alert_id: alert.id, relationship: "related" as const })),
    }),
  ];
}
