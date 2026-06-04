import type { CrimsonCreditRedemptionRow } from "@/lib/credits/types";
import { formatRedemptionStatusLabel } from "@/lib/credits/rewards-ui";

type Props = {
  redemptions: CrimsonCreditRedemptionRow[];
  loading?: boolean;
};

function statusTone(status: CrimsonCreditRedemptionRow["status"]) {
  switch (status) {
    case "pending":
      return "text-amber-200 border-amber-500/30 bg-amber-500/10";
    case "approved":
      return "text-sky-200 border-sky-500/30 bg-sky-500/10";
    case "fulfilled":
      return "text-emerald-200 border-emerald-500/30 bg-emerald-500/10";
    case "cancelled":
      return "text-zinc-400 border-white/15 bg-white/[0.04]";
    default:
      return "text-zinc-400 border-white/15 bg-white/[0.04]";
  }
}

export function CreditRedemptionHistoryList({ redemptions, loading = false }: Props) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Loading redemption history…</p>;
  }

  if (redemptions.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-zinc-500">
        No redemptions yet. Redeem a reward above when you are ready.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {redemptions.map((row) => {
        const refunded = row.status === "cancelled" && Boolean(row.refund_transaction_id);

        return (
          <li
            key={row.id}
            className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{row.reward_title}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {row.credits_spent.toLocaleString()} credits ·{" "}
                  {new Date(row.created_at).toLocaleString()}
                </p>
                {row.shirt_size ? (
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                    Size {row.shirt_size}
                  </p>
                ) : null}
                {refunded ? (
                  <p className="mt-2 text-xs text-emerald-300/90">Credits refunded</p>
                ) : null}
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] ${statusTone(row.status)}`}
              >
                {formatRedemptionStatusLabel(row.status)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
