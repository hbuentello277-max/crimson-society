import { safeProbeDetails } from "@/lib/monitoring/redact";
import { NEXUS_INTEGRATION_SLUGS } from "@/lib/nexus/constants";
import { NEXUS_MISSION_WORKFLOW_SLUGS } from "@/lib/nexus/constants";
import type {
  AlertEvaluationContext,
  AlertRuleRow,
  RuleEvaluationOutcome,
  RuleMatch,
  ScopeState,
} from "@/lib/alerts/types";
import { scopeKey } from "@/lib/alerts/deduplication";

const INTEGRATION_BAD_STATUSES: Record<string, string[]> = {
  down: ["down"],
  degraded: ["degraded", "down"],
};

const WORKFLOW_BAD_STATUSES: Record<string, string[]> = {
  failing: ["failing"],
  degraded: ["degraded", "failing"],
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function updateDurationState(input: {
  context: AlertEvaluationContext;
  key: string;
  isBad: boolean;
  statusLabel: string;
  value?: number | null;
}): { passedDuration: boolean; state: ScopeState } {
  const existing = input.context.evaluation_state[input.key] ?? {};
  const now = input.context.evaluated_at;
  let state: ScopeState = { ...existing };

  if (input.isBad) {
    if (!state.bad_since) {
      state.bad_since = now;
      state.streak = 1;
    } else {
      state.streak = (state.streak ?? 0) + 1;
    }
    state.was_bad = true;
    state.last_status = input.statusLabel;
    state.last_value = input.value ?? null;
  } else {
    state.was_bad = false;
    state.bad_since = null;
    state.streak = 0;
    state.last_status = input.statusLabel;
    state.last_value = input.value ?? null;
  }

  input.context.evaluation_state[input.key] = state;
  return { passedDuration: true, state };
}

function applyDurationGate(input: {
  rule: AlertRuleRow;
  key: string;
  isBad: boolean;
  statusLabel: string;
  value?: number | null;
  context: AlertEvaluationContext;
}): boolean {
  const durationMinutes = input.rule.condition.duration_minutes ?? 0;
  const { state } = updateDurationState({
    context: input.context,
    key: input.key,
    isBad: input.isBad,
    statusLabel: input.statusLabel,
    value: input.value,
  });

  if (!input.isBad) {
    return false;
  }

  if (durationMinutes <= 0) {
    return true;
  }

  if (!state.bad_since) {
    return false;
  }

  const elapsedMinutes =
    (new Date(input.context.evaluated_at).getTime() - new Date(state.bad_since).getTime()) / 60_000;
  return elapsedMinutes >= durationMinutes;
}

function buildMatch(rule: AlertRuleRow, match: Omit<RuleMatch, "rule">): RuleEvaluationOutcome {
  return {
    kind: "match",
    match: {
      rule,
      ...match,
      evidence: safeProbeDetails(match.evidence),
    },
  };
}

function evaluateIntegrationStatus(rule: AlertRuleRow, context: AlertEvaluationContext): RuleEvaluationOutcome[] {
  const targetStatus = rule.condition.status ?? "down";
  const badStatuses = INTEGRATION_BAD_STATUSES[targetStatus] ?? [targetStatus];
  const matches: RuleEvaluationOutcome[] = [];

  const slugs = rule.condition.integration_slug
    ? [rule.condition.integration_slug]
    : [...NEXUS_INTEGRATION_SLUGS];

  for (const slug of slugs) {
    const integration = context.integrations[slug];
    if (!integration) {
      continue;
    }

    const isBad = badStatuses.includes(integration.status);
    const key = scopeKey("integration", slug);
    const shouldFire = applyDurationGate({
      rule,
      key,
      isBad,
      statusLabel: integration.status,
      context,
    });

    if (shouldFire) {
      matches.push(
        buildMatch(rule, {
          scope: "integration",
          scope_id: slug,
          integration_id: integration.id,
          title: `${integration.slug} integration ${integration.status}`,
          message: `${rule.name}: ${slug} is ${integration.status}`,
          evidence: {
            integration_slug: slug,
            status: integration.status,
            last_check_at: integration.last_check_at,
          },
        }),
      );
    }
  }

  return matches.length > 0 ? matches : [{ kind: "no_match" }];
}

function evaluateWorkflowStatus(rule: AlertRuleRow, context: AlertEvaluationContext): RuleEvaluationOutcome[] {
  const targetStatus = rule.condition.status ?? "failing";
  const badStatuses = WORKFLOW_BAD_STATUSES[targetStatus] ?? [targetStatus];
  const matches: RuleEvaluationOutcome[] = [];

  for (const slug of NEXUS_MISSION_WORKFLOW_SLUGS) {
    const workflow = context.mission_workflows[slug];
    if (!workflow) {
      continue;
    }

    const isBad = badStatuses.includes(workflow.status);
    const key = scopeKey("workflow", slug);
    const shouldFire = applyDurationGate({
      rule,
      key,
      isBad,
      statusLabel: workflow.status,
      context,
    });

    if (shouldFire) {
      matches.push(
        buildMatch(rule, {
          scope: "workflow",
          scope_id: slug,
          title: `${workflow.display_name} ${workflow.status}`,
          message: `${rule.name}: ${workflow.display_name} workflow is ${workflow.status}`,
          evidence: {
            workflow_slug: slug,
            status: workflow.status,
            last_check_at: workflow.last_check_at,
          },
        }),
      );
    }
  }

  return matches.length > 0 ? matches : [{ kind: "no_match" }];
}

function evaluateWorkflowSlug(rule: AlertRuleRow, context: AlertEvaluationContext): RuleEvaluationOutcome {
  const slug = rule.condition.slug;
  const targetStatus = rule.condition.status ?? "failing";
  if (!slug) {
    return { kind: "skipped", reason: "missing workflow slug" };
  }

  const workflow = context.mission_workflows[slug];
  if (!workflow) {
    return { kind: "skipped", reason: `workflow not found: ${slug}` };
  }

  const isBad = workflow.status === targetStatus;
  const key = scopeKey("workflow", slug);
  const shouldFire = applyDurationGate({
    rule,
    key,
    isBad,
    statusLabel: workflow.status,
    context,
  });

  if (!shouldFire) {
    return { kind: "no_match" };
  }

  return buildMatch(rule, {
    scope: "workflow",
    scope_id: slug,
    title: `${workflow.display_name} ${workflow.status}`,
    message: `${rule.name}: ${workflow.display_name} is ${workflow.status}`,
    evidence: {
      workflow_slug: slug,
      status: workflow.status,
      last_check_at: workflow.last_check_at,
    },
  });
}

function evaluateMetricThreshold(rule: AlertRuleRow, context: AlertEvaluationContext): RuleEvaluationOutcome {
  const metricKey = rule.condition.metric_key;
  if (!metricKey) {
    return { kind: "skipped", reason: "missing metric_key" };
  }

  if (metricKey === "blackcard.cancellations_daily") {
    return { kind: "skipped", reason: "metric signal not available: blackcard.cancellations_daily" };
  }

  const snapshot = context.metrics[metricKey];
  if (!snapshot) {
    return { kind: "skipped", reason: `metric not available: ${metricKey}` };
  }

  const operator = rule.condition.operator ?? "lt";
  const threshold = rule.condition.value ?? 0;
  const history = context.metric_history[metricKey] ?? [];
  let isBad = false;
  let message = `${rule.name}: ${metricKey}=${snapshot.value}`;
  let deltaPct: number | null = null;

  if (operator === "lt") {
    isBad = snapshot.value < threshold;
    message = `${rule.name}: mission score ${snapshot.value} below ${threshold}`;
  } else if (operator === "drop_pct") {
    const values = history.map((row) => row.value).slice(0, 50);
    const baseline = average(values.slice(1));
    if (baseline === null || baseline <= 0) {
      return { kind: "skipped", reason: `insufficient metric history for ${metricKey}` };
    }
    deltaPct = ((baseline - snapshot.value) / baseline) * 100;
    isBad = deltaPct >= threshold;
    message = `${rule.name}: ${metricKey} dropped ${deltaPct.toFixed(1)}% vs recent average`;
  } else if (operator === "lt_avg_pct") {
    const values = history.map((row) => row.value).slice(0, 50);
    const baseline = average(values.slice(1));
    if (baseline === null || baseline <= 0) {
      return { kind: "skipped", reason: `insufficient metric history for ${metricKey}` };
    }
    const pct = (snapshot.value / baseline) * 100;
    isBad = pct < threshold;
    message = `${rule.name}: ${metricKey} at ${pct.toFixed(1)}% of recent average`;
  } else if (operator === "gt_avg_pct") {
    const values = history.map((row) => row.value).slice(0, 50);
    const baseline = average(values.slice(1));
    if (baseline === null || baseline <= 0) {
      return { kind: "skipped", reason: `insufficient metric history for ${metricKey}` };
    }
    const pct = (snapshot.value / baseline) * 100;
    isBad = pct > threshold;
    message = `${rule.name}: ${metricKey} at ${pct.toFixed(1)}% of recent average`;
  } else if (operator === "gt_multiplier") {
    return { kind: "skipped", reason: `unsupported metric operator: ${operator}` };
  } else {
    return { kind: "skipped", reason: `unsupported metric operator: ${operator}` };
  }

  const key = scopeKey("global", metricKey);
  const shouldFire = applyDurationGate({
    rule,
    key,
    isBad,
    statusLabel: String(snapshot.value),
    value: snapshot.value,
    context,
  });

  if (!shouldFire) {
    return { kind: "no_match" };
  }

  return buildMatch(rule, {
    scope: "global",
    scope_id: metricKey,
    title: rule.name,
    message,
    evidence: {
      metric_key: metricKey,
      value: snapshot.value,
      previous_value: snapshot.previous_value,
      delta_pct: deltaPct,
      operator,
      threshold,
    },
  });
}

function evaluateSourceThreshold(rule: AlertRuleRow, context: AlertEvaluationContext): RuleEvaluationOutcome {
  const source = rule.condition.source;
  const field = rule.condition.field;
  const operator = rule.condition.operator ?? "gt";
  const threshold = rule.condition.value ?? 0;

  if (!source) {
    return { kind: "skipped", reason: "missing source" };
  }

  if (operator !== "gt" && operator !== "gte") {
    return { kind: "skipped", reason: `unsupported source operator: ${operator}` };
  }

  let value: number | null = null;

  if (source === "stripe_webhook_events" && field === "failed_count") {
    value = context.derived.stripe_webhook_failed_1h ?? null;
  } else if (source === "push_notification_jobs" && field === "pending_count") {
    value = context.derived.push_pending_count ?? null;
  } else if (source === "shop_order_email_events") {
    value = context.derived.shop_order_email_events_24h ?? null;
  } else if (source === "user_reports") {
    value = context.derived.user_reports_24h ?? null;
  } else if (field === "login_failures") {
    return { kind: "skipped", reason: "login_failures signal not available" };
  } else {
    return { kind: "skipped", reason: `unsupported source: ${source}` };
  }

  if (value === null) {
    return { kind: "skipped", reason: `source signal unavailable: ${source}` };
  }

  const isBad = operator === "gt" ? value > threshold : value >= threshold;
  const key = scopeKey("source", `${source}:${field ?? "count"}`);
  const shouldFire = applyDurationGate({
    rule,
    key,
    isBad,
    statusLabel: String(value),
    value,
    context,
  });

  if (!shouldFire) {
    return { kind: "no_match" };
  }

  return buildMatch(rule, {
    scope: "source",
    scope_id: `${source}:${field ?? "count"}`,
    title: rule.name,
    message: `${rule.name}: ${source} ${field ?? "count"} is ${value} (threshold ${threshold})`,
    evidence: {
      source,
      field,
      value,
      threshold,
      operator,
    },
  });
}

function evaluateDeploymentStatus(rule: AlertRuleRow, context: AlertEvaluationContext): RuleEvaluationOutcome[] {
  const environment = rule.condition.environment ?? "production";
  const targetStatus = rule.condition.status ?? "error";
  const matches: RuleEvaluationOutcome[] = [];

  for (const deployment of context.deployments) {
    if (deployment.environment !== environment) {
      continue;
    }

    const isBad = deployment.status === targetStatus;
    const key = scopeKey("deployment", deployment.id);
    const shouldFire = applyDurationGate({
      rule,
      key,
      isBad,
      statusLabel: deployment.status,
      context,
    });

    if (shouldFire) {
      matches.push(
        buildMatch(rule, {
          scope: "deployment",
          scope_id: deployment.id,
          title: `${environment} deployment ${deployment.status}`,
          message: `${rule.name}: deployment ${deployment.id} is ${deployment.status}`,
          evidence: {
            deployment_id: deployment.id,
            environment: deployment.environment,
            status: deployment.status,
            started_at: deployment.started_at,
          },
        }),
      );
    }
  }

  if (context.deployments.length === 0) {
    return [{ kind: "skipped", reason: "no deployment records available" }];
  }

  return matches.length > 0 ? matches : [{ kind: "no_match" }];
}

export function evaluateAlertRule(
  rule: AlertRuleRow,
  context: AlertEvaluationContext,
): RuleEvaluationOutcome[] {
  const type = rule.condition.type;

  if (type === "integration_status") {
    return evaluateIntegrationStatus(rule, context);
  }

  if (type === "workflow_status") {
    return evaluateWorkflowStatus(rule, context);
  }

  if (type === "workflow_slug") {
    return [evaluateWorkflowSlug(rule, context)];
  }

  if (type === "threshold" && rule.condition.metric_key) {
    return [evaluateMetricThreshold(rule, context)];
  }

  if (type === "threshold" && (rule.condition.source || rule.condition.field === "login_failures")) {
    return [evaluateSourceThreshold(rule, context)];
  }

  if (type === "deployment_status") {
    return evaluateDeploymentStatus(rule, context);
  }

  return [{ kind: "skipped", reason: `unsupported condition type: ${type}` }];
}

export function isRecoveryRule(rule: AlertRuleRow): boolean {
  const kind = rule.metadata?.rule_kind;
  if (kind === "recovery") {
    return true;
  }
  return rule.condition.type.startsWith("recovery.");
}
