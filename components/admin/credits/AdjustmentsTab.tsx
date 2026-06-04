"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminUserSearch, type SelectedAdminUser } from "@/components/admin/credits/AdminUserSearch";
import {
  ADJUSTMENT_AMOUNT_PRESETS,
  ADJUSTMENT_REASON_PRESETS,
} from "@/components/admin/credits/adjustment-quick-actions";
import { QuickPresetChips } from "@/components/admin/credits/QuickPresetChips";
import type { AdminCreditUserSummary } from "@/lib/credits/admin-types";

type Props = {
  onAdjustmentSuccess?: () => void;
};

export function AdjustmentsTab({ onAdjustmentSuccess }: Props) {
  const [selectedUser, setSelectedUser] = useState<SelectedAdminUser | null>(null);
  const [summary, setSummary] = useState<AdminCreditUserSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryRefreshing, setSummaryRefreshing] = useState(false);
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const loadSummary = useCallback(async (userId: string, options?: { refresh?: boolean }) => {
    const isRefresh = options?.refresh === true;
    if (isRefresh) {
      setSummaryRefreshing(true);
    } else {
      setSummaryLoading(true);
      setSummary(null);
    }

    try {
      const res = await fetch(`/api/admin/credits/users/summary?user_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load balance");
      }
      setSummary(data.summary);
    } catch {
      if (!isRefresh) {
        setSummary(null);
      }
    } finally {
      setSummaryLoading(false);
      setSummaryRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedUser) {
      setSummary(null);
      return;
    }
    void loadSummary(selectedUser.id);
  }, [selectedUser, loadSummary]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) {
      setError("Select a member before applying an adjustment.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive integer.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/credits/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          direction,
          amount: parsedAmount,
          reason: reason.trim(),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Adjustment failed");
      }

      const r = data.result as { credits_balance?: number; direction?: string; amount?: number };

      if (typeof r.credits_balance === "number") {
        setSummary((prev) =>
          prev
            ? { ...prev, credits_balance: r.credits_balance as number }
            : prev,
        );
      }

      await loadSummary(selectedUser.id, { refresh: true });
      onAdjustmentSuccess?.();

      setResult(
        `Success: ${r.direction} ${Math.abs(r.amount ?? parsedAmount)} credits. New balance: ${r.credits_balance ?? summary?.credits_balance ?? "—"}.`,
      );
      setAmount("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-zinc-500">
        Manual adjustments are logged as <code className="text-zinc-400">admin_adjustment</code> and do not
        count toward the monthly earn cap. Balance cannot go below zero.
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5">
        <AdminUserSearch selected={selectedUser} onSelect={setSelectedUser} />

        {selectedUser && (
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
            {summaryLoading && !summary ? (
              <p className="text-xs text-zinc-500">Loading balance…</p>
            ) : summary ? (
              <div className={`space-y-1 text-sm ${summaryRefreshing ? "opacity-70" : ""}`}>
                <p>
                  <span className="text-zinc-500">Current balance:</span>{" "}
                  <span className="font-medium text-white">{summary.credits_balance} credits</span>
                  {summaryRefreshing ? (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-600">Updating…</span>
                  ) : null}
                </p>
                <p>
                  <span className="text-zinc-500">Monthly earned:</span>{" "}
                  <span className="text-zinc-300">
                    {summary.monthly_earned} / {summary.monthly_cap}
                  </span>
                </p>
                <p className="text-xs text-zinc-600">
                  Lifetime earned {summary.lifetime_credits_earned} · spent {summary.lifetime_credits_spent}
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No credit balance on file yet (starts at 0).</p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Direction</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "add" | "remove")}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="add">Add credits</option>
              <option value="remove">Remove credits</option>
            </select>
          </label>

          <div className="block sm:col-span-2">
            <QuickPresetChips
              label="Quick amount"
              options={ADJUSTMENT_AMOUNT_PRESETS}
              formatOption={(value) => `+${value}`}
              onSelect={(value) => setAmount(String(value))}
            />
            <label className="mt-3 block">
              <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Amount</span>
              <input
                type="number"
                min={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
        </div>

        <div>
          <QuickPresetChips
            label="Quick reason"
            options={ADJUSTMENT_REASON_PRESETS}
            onSelect={(value) => setReason(String(value))}
          />
          <label className="mt-3 block">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Reason (required)</span>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Support credit, correction, etc."
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Internal note (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          />
        </label>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {result && <p className="text-sm text-emerald-300">{result}</p>}

        <button
          type="submit"
          disabled={submitting || !selectedUser}
          className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:border-[#b4141e]/80 disabled:opacity-50"
        >
          {submitting ? "Applying…" : "Apply adjustment"}
        </button>
      </form>
    </div>
  );
}
