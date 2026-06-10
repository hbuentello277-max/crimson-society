"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  NexusDensePanel,
  NexusOverviewMetricCard,
  NexusStatusChip,
} from "@/components/nexus/NexusCommandUI";
import { NexusListEmpty, NexusSectionFrame } from "@/components/nexus/NexusShared";
import { NexusStatusBadge } from "@/components/nexus/NexusStatusBadge";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
import type {
  AutomationHistoryEntry,
  AutomationRule,
  AutomationStudioSummary,
  AutomationTemplateSuggestion,
  AutomationTrigger,
} from "@/lib/automation-studio/types";

type StudioPayload = {
  ok?: boolean;
  summary?: AutomationStudioSummary;
};

async function requestNexusJson<T>(
  path: string,
  method: "POST" | "PATCH",
  body?: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    return { ok: false, error: payload?.error ?? `Request failed (${response.status})` };
  }
  return { ok: true, data: payload as T };
}

function ruleStatusBadge(status: AutomationRule["status"]) {
  switch (status) {
    case "active":
      return <NexusStatusBadge label="Active" tone="healthy" />;
    case "paused":
      return <NexusStatusBadge label="Paused" tone="warning" />;
    case "draft":
      return <NexusStatusBadge label="Draft" tone="info" />;
    case "disabled":
      return <NexusStatusBadge label="Disabled" tone="neutral" />;
    default:
      return <NexusStatusBadge label={status} />;
  }
}

function triggerStatusBadge(status: AutomationTrigger["status"]) {
  switch (status) {
    case "needs_approval":
      return <NexusStatusBadge label="Needs Approval" tone="warning" />;
    case "triggered":
      return <NexusStatusBadge label="Triggered" tone="info" />;
    case "approved":
      return <NexusStatusBadge label="Approved" tone="healthy" />;
    case "dismissed":
      return <NexusStatusBadge label="Dismissed" tone="neutral" />;
    default:
      return <NexusStatusBadge label={status} />;
  }
}

function formatWhen(value: string | null | undefined) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function RuleCard({
  rule,
  readOnly,
  onStatusChange,
  onEvaluate,
  pending,
}: {
  rule: AutomationRule;
  readOnly: boolean;
  onStatusChange: (ruleId: string, status: AutomationRule["status"]) => Promise<void>;
  onEvaluate: (ruleId: string) => Promise<void>;
  pending: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-white">{rule.name}</h3>
            {ruleStatusBadge(rule.status)}
          </div>
          <p className="mt-1 text-sm text-zinc-400">{rule.description}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Condition: {rule.condition_type.replaceAll("_", " ")}
          </p>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p>Last checked: {formatWhen(rule.last_checked_at)}</p>
          <p>Last triggered: {formatWhen(rule.last_triggered_at)}</p>
        </div>
      </div>

      {!readOnly ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {rule.status !== "active" ? (
            <button
              type="button"
              disabled={pending != null}
              onClick={() => void onStatusChange(rule.id, "active")}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-emerald-200 disabled:opacity-50"
            >
              Enable
            </button>
          ) : null}
          {rule.status === "active" ? (
            <button
              type="button"
              disabled={pending != null}
              onClick={() => void onStatusChange(rule.id, "paused")}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-amber-100 disabled:opacity-50"
            >
              Pause
            </button>
          ) : null}
          {rule.status !== "disabled" ? (
            <button
              type="button"
              disabled={pending != null}
              onClick={() => void onStatusChange(rule.id, "disabled")}
              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300 disabled:opacity-50"
            >
              Disable
            </button>
          ) : null}
          <button
            type="button"
            disabled={pending != null}
            onClick={() => void onEvaluate(rule.id)}
            className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] disabled:opacity-50"
          >
            {pending === `evaluate:${rule.id}` ? "Evaluating…" : "Evaluate"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  readOnly,
  onCreate,
  pending,
}: {
  suggestion: AutomationTemplateSuggestion;
  readOnly: boolean;
  onCreate: (templateId: string) => Promise<void>;
  pending: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-white">{suggestion.name}</h3>
            {suggestion.currently_relevant ? (
              <NexusStatusBadge label="Relevant now" tone="warning" />
            ) : (
              <NexusStatusBadge label="Suggested" tone="neutral" />
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-400">{suggestion.description}</p>
          <p className="mt-2 text-xs text-zinc-500">{suggestion.relevance_reason}</p>
        </div>
      </div>
      {!readOnly ? (
        <button
          type="button"
          disabled={pending != null}
          onClick={() => void onCreate(suggestion.template_id)}
          className="mt-3 rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] disabled:opacity-50"
        >
          {pending === `create:${suggestion.template_id}` ? "Creating…" : "Create draft rule"}
        </button>
      ) : null}
    </div>
  );
}

function TriggerCard({ trigger }: { trigger: AutomationTrigger }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium text-white">{trigger.rule?.name ?? "Automation rule"}</h3>
            {triggerStatusBadge(trigger.status)}
          </div>
          <p className="mt-1 text-sm text-zinc-400">{trigger.trigger_reason}</p>
          <p className="mt-2 text-xs text-zinc-500">{formatWhen(trigger.created_at)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {trigger.generated_action_id ? (
          <Link
            href={`/admin/nexus/actions`}
            className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300"
          >
            Action Center draft
          </Link>
        ) : null}
        {trigger.generated_plan_id ? (
          <Link
            href="/admin/nexus"
            className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300"
          >
            Operations plan
          </Link>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-amber-200/80">Pending founder approval — NEXUS does not execute automatically.</p>
    </div>
  );
}

function HistoryRow({ entry }: { entry: AutomationHistoryEntry }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/5 py-2 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-white">{entry.summary}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{entry.event_type.replaceAll("_", " ")}</p>
      </div>
      <p className="shrink-0 text-xs text-zinc-500">{formatWhen(entry.created_at)}</p>
    </div>
  );
}

export function AutomationStudioCenter() {
  const { data, error, loading, refresh } = useNexusFetch<StudioPayload>(
    "/api/nexus/automation-studio",
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const summary = data?.summary;
  const readOnly = summary?.readOnly ?? false;

  const counts = summary?.counts ?? { active: 0, paused: 0, draft: 0, needs_approval: 0 };

  const needsApprovalTriggers = useMemo(
    () => (summary?.recent_triggers ?? []).filter((trigger) => trigger.status === "needs_approval"),
    [summary?.recent_triggers],
  );

  const updateRuleStatus = useCallback(
    async (ruleId: string, status: AutomationRule["status"]) => {
      const key = `status:${ruleId}:${status}`;
      setPendingKey(key);
      setMutationError(null);
      setMessage(null);
      const result = await requestNexusJson<{ ok?: boolean }>(
        `/api/nexus/automation-studio/rules/${ruleId}`,
        "PATCH",
        { status },
      );
      setPendingKey(null);
      if (!result.ok) {
        setMutationError(result.error);
        return;
      }
      setMessage(`Rule updated to ${status}.`);
      await refresh();
    },
    [refresh],
  );

  const createFromTemplate = useCallback(
    async (templateId: string) => {
      const key = `create:${templateId}`;
      setPendingKey(key);
      setMutationError(null);
      setMessage(null);
      const result = await requestNexusJson<{ ok?: boolean }>(
        "/api/nexus/automation-studio/rules",
        "POST",
        { template_id: templateId, status: "draft" },
      );
      setPendingKey(null);
      if (!result.ok) {
        setMutationError(result.error);
        return;
      }
      setMessage("Automation rule draft created. Enable it when you are ready for NEXUS to monitor.");
      await refresh();
    },
    [refresh],
  );

  const evaluateRule = useCallback(
    async (ruleId: string) => {
      const key = `evaluate:${ruleId}`;
      setPendingKey(key);
      setMutationError(null);
      setMessage(null);
      const result = await requestNexusJson<{
        result?: { triggered?: boolean; reason?: string };
      }>(`/api/nexus/automation-studio/rules/${ruleId}/evaluate`, "POST");
      setPendingKey(null);
      if (!result.ok) {
        setMutationError(result.error);
        return;
      }
      setMessage(
        result.data.result?.triggered
          ? "Condition met. Draft outputs prepared for approval."
          : result.data.result?.reason ?? "Evaluation complete.",
      );
      await refresh();
    },
    [refresh],
  );

  const evaluateAll = useCallback(async () => {
    setPendingKey("evaluate-all");
    setMutationError(null);
    setMessage(null);
    const result = await requestNexusJson<{ results?: Array<{ triggered: boolean }> }>(
      "/api/nexus/automation-studio",
      "POST",
    );
    setPendingKey(null);
    if (!result.ok) {
      setMutationError(result.error);
      return;
    }
    const triggered = result.data.results?.filter((item) => item.triggered).length ?? 0;
    setMessage(
      triggered > 0
        ? `${triggered} automation(s) prepared draft outputs for approval.`
        : "All active automations evaluated. No new triggers.",
    );
    await refresh();
  }, [refresh]);

  return (
    <div>
      <NexusSectionFrame
        title="Automation Studio"
        description="Founder-controlled automations that monitor Platform Status signals and prepare draft actions for Action Center approval. NEXUS never executes without your approval."
        loading={loading}
        error={error}
        onRefresh={refresh}
      >
        {!loading ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
              NEXUS can prepare work. NEXUS cannot execute work without founder approval. All
              outputs remain draft and pending approval.
            </div>

            {readOnly ? (
              <p className="text-sm text-zinc-400">Read-only operational view for admin staff.</p>
            ) : null}

            {mutationError ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {mutationError}
              </div>
            ) : null}

            {message ? (
              <div className="rounded-2xl border border-[#b4141e]/30 bg-[#b4141e]/10 p-4 text-sm text-[#f1c3c7]">
                {message}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <NexusOverviewMetricCard label="Active" value={counts.active} tone="healthy" />
              <NexusOverviewMetricCard label="Paused" value={counts.paused} tone="warning" />
              <NexusOverviewMetricCard label="Draft" value={counts.draft} />
              <NexusOverviewMetricCard
                label="Needs approval"
                value={counts.needs_approval}
                tone="warning"
                href="/admin/nexus/actions"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <NexusStatusChip label="Watching" value={counts.active + counts.paused} />
              <NexusStatusChip label="Triggered" value={needsApprovalTriggers.length} tone="warning" />
              {!readOnly ? (
                <button
                  type="button"
                  disabled={pendingKey != null}
                  onClick={() => void evaluateAll()}
                  className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] disabled:opacity-50"
                >
                  {pendingKey === "evaluate-all" ? "Evaluating…" : "Evaluate all active"}
                </button>
              ) : null}
            </div>

            <NexusDensePanel title="Active Automations" collapsible defaultOpen>
              {(summary?.active_rules ?? []).length > 0 ? (
                <div className="space-y-3">
                  {(summary?.active_rules ?? []).map((rule) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      readOnly={readOnly}
                      onStatusChange={updateRuleStatus}
                      onEvaluate={evaluateRule}
                      pending={pendingKey}
                    />
                  ))}
                </div>
              ) : (
                <NexusListEmpty
                  title="No automation rules yet"
                  description="Create one from suggested templates below."
                />
              )}
            </NexusDensePanel>

            <NexusDensePanel title="Suggested Automations" collapsible defaultOpen>
              {(summary?.suggested_rules ?? []).length > 0 ? (
                <div className="space-y-3">
                  {(summary?.suggested_rules ?? []).map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.template_id}
                      suggestion={suggestion}
                      readOnly={readOnly}
                      onCreate={createFromTemplate}
                      pending={pendingKey}
                    />
                  ))}
                </div>
              ) : (
                <NexusListEmpty title="No template suggestions available." />
              )}
            </NexusDensePanel>

            <NexusDensePanel title="Triggered Automations" collapsible defaultOpen>
              {(summary?.recent_triggers ?? []).length > 0 ? (
                <div className="space-y-3">
                  {(summary?.recent_triggers ?? []).map((trigger) => (
                    <TriggerCard key={trigger.id} trigger={trigger} />
                  ))}
                </div>
              ) : (
                <NexusListEmpty
                  title="No recent triggers"
                  description="Active rules prepare drafts here when conditions are met."
                />
              )}
            </NexusDensePanel>

            <NexusDensePanel title="Automation History" collapsible defaultOpen={false}>
              {(summary?.history ?? []).length > 0 ? (
                <div>
                  {(summary?.history ?? []).map((entry) => (
                    <HistoryRow key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <NexusListEmpty title="No automation history yet." />
              )}
            </NexusDensePanel>
          </div>
        ) : null}
      </NexusSectionFrame>
    </div>
  );
}
