"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useNexusStoredState } from "@/hooks/nexus/useNexusPageState";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";
import type { RecommendedOperationsPlan } from "@/lib/operations-planner/types";

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

const DISMISS_KEY = "nexus:recommended-plan:dismissed-at";
const EXPANDED_KEY = "nexus:recommended-plan:expanded";

function wasDismissedRecently(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.sessionStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < 6 * 60 * 60 * 1000;
}

function formatImpact(score: number) {
  return `${score}/100`;
}

export function RecommendedPlanBanner() {
  const [payload, setPayload] = useState<RecommendedOperationsPlan | null>(null);
  const [visible, setVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useNexusStoredState(EXPANDED_KEY, false);

  useEffect(() => {
    if (wasDismissedRecently()) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetchNexusClientJson<RecommendedOperationsPlan>(
          "/api/nexus/operations-plans/recommended",
        );
        if (!cancelled && response.available && response.plan) {
          setPayload(response);
          setVisible(true);
        }
      } catch {
        if (!cancelled) setVisible(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setVisible(false);
  }, []);

  const createDrafts = useCallback(async () => {
    if (!payload?.plan) return;
    setCreating(true);
    setMessage(null);
    try {
      const generated = await postNexusJson<{ plan: { id: string } }>(
        "/api/nexus/operations-plans/generate",
        {
          planType: payload.plan.plan_type,
          transcript: payload.plan.reason,
        },
      );
      await postNexusJson(`/api/nexus/operations-plans/${generated.plan.id}/action-drafts`);
      setMessage("Action Center drafts created. Review and approve before anything executes.");
    } catch {
      setMessage("Could not create Action Center drafts right now.");
    } finally {
      setCreating(false);
    }
  }, [payload?.plan]);

  if (!visible || !payload?.plan) return null;

  const plan = payload.plan;

  return (
    <section className="rounded-xl border border-[#b4141e]/35 bg-[#b4141e]/8">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left sm:px-4"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">Recommended Plan</p>
          <p className="mt-1 font-medium text-white">{plan.title}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-300">
            <span>
              Priority: <span className="text-white">{plan.priority}</span>
            </span>
            <span>
              Estimated impact:{" "}
              <span className="text-white">{formatImpact(plan.estimated_impact_score)}</span>
            </span>
          </div>
        </div>
        <span aria-hidden className="mt-1 shrink-0 text-sm text-[#e87a82]">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-[#b4141e]/20 px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
          <div className="space-y-3 text-sm text-zinc-300">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Objective</p>
              <p className="mt-1 text-zinc-200">{plan.objective}</p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Reason</p>
              <p className="mt-1 text-zinc-200">{plan.reason}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#b4141e]/25 bg-[#b4141e]/5 px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Risks</p>
                {plan.related_risks.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">No linked risks.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {plan.related_risks.map((risk) => (
                      <li key={risk.id}>
                        <p className="font-medium text-white">{risk.title}</p>
                        <p className="text-zinc-400">{risk.summary}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/15 px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Opportunities</p>
                {plan.related_opportunities.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500">No linked opportunities.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {plan.related_opportunities.map((item) => (
                      <li key={item.id}>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="text-zinc-400">{item.summary}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Recommended Steps</p>
              <ol className="mt-2 space-y-2 text-zinc-200">
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

            {plan.suggested_action_drafts.length > 0 ? (
              <div>
                <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">Existing plan actions</p>
                <ul className="mt-2 space-y-2">
                  {plan.suggested_action_drafts.map((action) => (
                    <li
                      key={`${action.action_type}-${action.title}`}
                      className="rounded-lg border border-white/10 bg-black/25 px-3 py-2"
                    >
                      <p className="font-medium text-white">{action.title}</p>
                      <p className="mt-1 text-zinc-400">{action.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {message ? <p className="mt-3 text-xs text-zinc-400">{message}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/admin/nexus"
              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-200 transition hover:border-white/25"
            >
              View Plan
            </Link>
            <button
              type="button"
              disabled={creating}
              onClick={() => void createDrafts()}
              className="rounded-lg border border-[#b4141e]/50 bg-[#b4141e]/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#f1c3c7] transition hover:bg-[#b4141e]/20 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Action Drafts"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-white/25"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
