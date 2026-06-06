import type { RunbookDbRow, RunbookSuggestion, RunbookSuggestionContext } from "@/lib/runbooks/types";

const CATEGORY_MAP: Record<string, string[]> = {
  infra: ["category:infra", "category:health"],
  health: ["category:infra", "category:health"],
  mission: ["category:mission"],
  commerce: ["category:commerce", "category:revenue"],
  revenue: ["category:revenue", "category:commerce"],
  growth: ["category:growth"],
  security: ["category:security"],
  recovery: ["category:infra", "category:mission"],
};

function normalize(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function scoreRunbook(runbook: RunbookDbRow, context: RunbookSuggestionContext): RunbookSuggestion | null {
  let score = 0;
  const reasons: string[] = [];
  const triggers = runbook.trigger_types.map((t) => t.toLowerCase());
  const category = normalize(context.category);
  const severity = normalize(context.severity);
  const ruleId = normalize(context.rule_id);
  const integration = normalize(context.integration_slug);
  const workflow = normalize(context.workflow_slug);
  const title = normalize(context.title);

  if (context.source === "war_room" && triggers.includes("context:war_room")) {
    score += 40;
    reasons.push("War room context");
  }

  if (context.source === "incident" && triggers.includes("context:incident")) {
    score += 35;
    reasons.push("Incident context");
  }

  if (severity && triggers.includes(`severity:${severity}`)) {
    score += 20;
    reasons.push(`${severity} severity`);
  }

  for (const token of CATEGORY_MAP[category] ?? [`category:${category}`]) {
    if (category && triggers.includes(token)) {
      score += 25;
      reasons.push(`Category ${category}`);
      break;
    }
  }

  if (ruleId && triggers.includes(`rule:${ruleId}`)) {
    score += 45;
    reasons.push(`Rule ${ruleId}`);
  }

  if (integration && triggers.includes(`integration:${integration}`)) {
    score += 40;
    reasons.push(`Integration ${integration}`);
  }

  if (workflow && triggers.includes(`workflow:${workflow}`)) {
    score += 40;
    reasons.push(`Workflow ${workflow}`);
  }

  if (title) {
    if (title.includes("supabase") && triggers.some((t) => t.includes("supabase"))) {
      score += 30;
      reasons.push("Supabase signal");
    }
    if (title.includes("stripe") && triggers.some((t) => t.includes("stripe"))) {
      score += 30;
      reasons.push("Stripe signal");
    }
    if (title.includes("login") && triggers.includes("workflow:user_login")) {
      score += 30;
      reasons.push("Login signal");
    }
    if (title.includes("messag") && triggers.includes("workflow:messaging")) {
      score += 30;
      reasons.push("Messaging signal");
    }
    if (title.includes("meet") && triggers.some((t) => t.includes("meet"))) {
      score += 30;
      reasons.push("Meet signal");
    }
    if (title.includes("push") && triggers.includes("workflow:push_notification_delivery")) {
      score += 30;
      reasons.push("Push signal");
    }
    if (title.includes("revenue") || title.includes("mrr")) {
      if (triggers.includes("category:revenue") || triggers.includes("insight:revenue")) {
        score += 25;
        reasons.push("Revenue signal");
      }
    }
    if (title.includes("growth") || title.includes("signup")) {
      if (triggers.includes("category:growth") || triggers.includes("workflow:user_signup")) {
        score += 25;
        reasons.push("Growth signal");
      }
    }
  }

  if (context.source === "observation") {
    if (category === "growth" && triggers.includes("insight:growth")) {
      score += 20;
      reasons.push("Growth insight");
    }
    if ((category === "revenue" || category === "commerce") && triggers.includes("insight:revenue")) {
      score += 20;
      reasons.push("Revenue insight");
    }
  }

  if (score < 20) {
    return null;
  }

  return {
    id: runbook.id,
    slug: runbook.slug,
    title: runbook.title,
    category: runbook.category,
    severity: runbook.severity,
    description: runbook.description,
    match_score: score,
    match_reasons: reasons,
  };
}

export function suggestRunbooks(
  runbooks: RunbookDbRow[],
  context: RunbookSuggestionContext,
  limit = 4,
): RunbookSuggestion[] {
  return runbooks
    .filter((runbook) => runbook.status === "active")
    .map((runbook) => scoreRunbook(runbook, context))
    .filter((item): item is RunbookSuggestion => item !== null)
    .sort((a, b) => b.match_score - a.match_score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function inferIntegrationFromAlert(input: {
  rule_id?: string | null;
  category?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown>;
}): string | null {
  const evidence = input.metadata?.evidence;
  if (evidence && typeof evidence === "object") {
    const slug = (evidence as Record<string, unknown>).integration_slug;
    if (typeof slug === "string") {
      return slug;
    }
  }

  const haystack = `${input.rule_id ?? ""} ${input.title ?? ""}`.toLowerCase();
  const integrations = ["supabase", "stripe", "github", "vercel", "resend", "crimson_society"];
  return integrations.find((slug) => haystack.includes(slug)) ?? null;
}

export function inferWorkflowFromAlert(input: {
  rule_id?: string | null;
  title?: string | null;
}): string | null {
  const haystack = `${input.rule_id ?? ""} ${input.title ?? ""}`.toLowerCase();
  const workflows = [
    "user_login",
    "user_signup",
    "meet_creation",
    "meet_joining",
    "messaging",
    "push_notification_delivery",
    "blackcard_purchase",
    "stripe_webhook_processing",
    "media_upload",
    "post_creation",
  ];
  return workflows.find((slug) => haystack.includes(slug.replaceAll("_", " ")) || haystack.includes(slug)) ?? null;
}
