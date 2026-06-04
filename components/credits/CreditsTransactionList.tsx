"use client";

import type { CrimsonCreditTransactionRow } from "@/lib/credits/types";
import { formatCreditTransactionLine } from "@/lib/credits/transaction-labels";

type Props = {
  transactions: CrimsonCreditTransactionRow[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
};

export function CreditsTransactionList({
  transactions,
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
}: Props) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Loading history…</p>;
  }

  if (transactions.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-zinc-500">
        No transactions yet. Earn credits by hosting or attending meets, or through referrals.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {transactions.map((tx) => {
          const line = formatCreditTransactionLine(tx.transaction_type, tx.amount, tx.reason);
          const positive = tx.amount > 0;

          return (
            <li
              key={tx.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium ${positive ? "text-emerald-300" : "text-red-300"}`}>
                  {line}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  {new Date(tx.created_at).toLocaleString()}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore && onLoadMore ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={onLoadMore}
          className="w-full rounded-xl border border-white/10 py-2.5 text-xs uppercase tracking-[0.2em] text-zinc-400 transition hover:border-white/20 hover:text-white disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
