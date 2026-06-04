"use client";

import { useState } from "react";

export function AdjustmentsTab() {
  const [userId, setUserId] = useState("");
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          user_id: userId.trim(),
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
      setResult(
        `Success: ${r.direction} ${Math.abs(r.amount ?? parsedAmount)} credits. New balance: ${r.credits_balance ?? "—"}.`,
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
        <label className="block">
          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">User ID (UUID)</span>
          <input
            type="text"
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
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

          <label className="block">
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

        <label className="block">
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
          disabled={submitting}
          className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:border-[#b4141e]/80 disabled:opacity-50"
        >
          {submitting ? "Applying…" : "Apply adjustment"}
        </button>
      </form>
    </div>
  );
}
