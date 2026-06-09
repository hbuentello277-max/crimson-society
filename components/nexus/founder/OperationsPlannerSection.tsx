"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useNexusFetch } from "@/hooks/nexus/useNexusFetch";
async function postNexusJson<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? `Request failed (${response.status})`);
  }
  return payload as T;
}
import { NexusLoadingPanel } from "@/components/nexus/NexusShared";
import type { OperationsPlan, OperationsPlanSummary } from "@/lib/operations-planner/types";

type PlansPayload = OperationsPlanSummary & { ok?: boolean };

function PlanCard({
  plan,
  onCreateDrafts,
  creating,
}: {
  plan: OperationsPlan;
  onCreateDrafts: (planId: string) => Promise<void>;
  creating: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">{plan.plan_type} plan</p>
          <h3 className="mt-1 font-medium text-white">{plan.title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{plan.objective}</p>
        </div>
        <div className="text-right text-xs text-zinc-400">
          <p>Priority: <span className="text-white">{plan.priority}</span></p>
          <p>Confidence: <span className="text-white">{plan.confidence_score}</span></p>
          <p>Impact: <span className="text-white">{plan.estimated_impact_score}</span></p>
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-300">{plan.reason}</p>

      <div className="mt-3">
        <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Recommended steps</p>
        <ol className="mt-2 space-y-2 text-sm text-zinc-200">
          {plan.steps.map((step) => (
            <li key={step.order} className="flex gap-2">
              <span className="text-[#e87a82]">{step.order}.</span>
              <span>
                <span className="font-medium text-white">{step.title}</span>
                <span className="text-zinc-400"> — {step.summary}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={creating}
          onClick={() => void onCreateDrafts(plan.id)}
          className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20 disabled:opacity-50"
        >
          {creating ? "Creating drafts…" : "Create Action Center Draft"}
        </button>
        <Link
          href="/admin/nexus/actions"
          className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300 transition hover:border-white/25"
        >
          Review in Action Center
        </Link>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Status: {plan.status.replaceAll("_", " ")} · Approval required.</p>
    </div>
  );
}

export function OperationsPlannerSection() {
  const { data, error, loading, refresh } = useNexusFetch<PlansPayload>("/api/nexus/operations-plans");
  const [generating, setGenerating] = useState(false);
  const [creatingPlanId, setCreatingPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const generatePlan = useCallback(async () => {
    setGenerating(true);
    setMessage(null);
    try {
      await postNexusJson("/api/nexus/operations-plans/generate", {
        transcript: "What should happen next?",
      });
      await refresh();
      setMessage("Operations plan generated. Review steps and create Action Center drafts when ready.");
    } catch {
      setMessage("Could not generate an operations plan right now.");
    } finally {
      setGenerating(false);
    }
  }, [refresh]);

  const createDrafts = useCallback(
    async (planId: string) => {
      setCreatingPlanId(planId);
      setMessage(null);
      try {
        await postNexusJson(`/api/nexus/operations-plans/${planId}/action-drafts`);
        setMessage("Action Center drafts created and set to pending approval.");
      } catch {
        setMessage("Could not create Action Center drafts from this plan.");
      } finally {
        setCreatingPlanId(null);
      }
    },
    [],
  );

  if (loading) {
    return <NexusLoadingPanel rows={2} />;
  }

  const plans = data?.plans ?? [];
  const featured = plans[0] ?? null;

  return (
    <section className="rounded-2xl border border-[#b4141e]/30 bg-gradient-to-r from-[#120608]/90 via-[#0a0608]/90 to-black/90 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Operations Planner</p>
          <h2 className="mt-1 font-serif text-xl text-white sm:text-2xl">What to do next</h2>
          <p className="mt-2 text-sm text-zinc-400">
            NEXUS prepares complete operational plans from Platform Intelligence. Nothing executes automatically.
          </p>
        </div>
        <button
          type="button"
          disabled={generating}
          onClick={() => void generatePlan()}
          className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20 disabled:opacity-50"
        >
          {generating ? "Generating…" : "Generate Plan"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-zinc-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-amber-200">Operations Planner is temporarily unavailable.</p> : null}

      {featured ? (
        <div className="mt-4">
          <PlanCard
            plan={featured}
            onCreateDrafts={createDrafts}
            creating={creatingPlanId === featured.id}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          No operations plans yet. Generate a plan from current risks, opportunities, and launch blockers.
        </p>
      )}
    </section>
  );
}
