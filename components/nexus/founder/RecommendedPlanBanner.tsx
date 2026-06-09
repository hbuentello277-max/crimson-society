"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchNexusClientJson } from "@/lib/nexus/client-fetch";

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
import type { RecommendedOperationsPlan } from "@/lib/operations-planner/types";

const DISMISS_KEY = "nexus:recommended-plan:dismissed-at";

function wasDismissedRecently(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.sessionStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < 6 * 60 * 60 * 1000;
}

export function RecommendedPlanBanner() {
  const [payload, setPayload] = useState<RecommendedOperationsPlan | null>(null);
  const [visible, setVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div className="rounded-xl border border-[#b4141e]/35 bg-[#b4141e]/8 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">Recommended Plan Available</p>
          <p className="mt-1 font-medium text-white">{payload.plan.title}</p>
          <p className="mt-1 text-sm text-zinc-300">{payload.plan.reason}</p>
          {message ? <p className="mt-2 text-xs text-zinc-400">{message}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
