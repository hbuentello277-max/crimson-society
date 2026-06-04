"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminUserIdentity } from "@/components/admin/credits/AdminUserIdentity";
import type { AdminCreditRedemptionRow } from "@/lib/credits/admin-rewards-types";
import { formatRewardCategoryLabel, formatRedemptionStatusLabel } from "@/lib/credits/rewards-ui";
import type { CrimsonCreditRedemptionStatus } from "@/lib/credits/types";

const STATUSES: Array<CrimsonCreditRedemptionStatus | "all"> = [
  "all",
  "pending",
  "approved",
  "fulfilled",
  "cancelled",
];

function statusBadgeClass(status: CrimsonCreditRedemptionStatus) {
  switch (status) {
    case "pending":
      return "border-amber-500/35 bg-amber-500/10 text-amber-200";
    case "approved":
      return "border-sky-500/35 bg-sky-500/10 text-sky-200";
    case "fulfilled":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
    case "cancelled":
      return "border-zinc-500/35 bg-zinc-500/10 text-zinc-400";
  }
}

type Props = {
  refreshKey?: number;
};

export function RedemptionsTab({ refreshKey = 0 }: Props) {
  const [rows, setRows] = useState<AdminCreditRedemptionRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<CrimsonCreditRedemptionStatus | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/rewards/redemptions?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load redemptions");
      setRows(data.redemptions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function updateStatus(
    row: AdminCreditRedemptionRow,
    status: CrimsonCreditRedemptionStatus,
  ) {
    if (status === "cancelled" && !window.confirm("Cancel and refund credits to this member?")) {
      return;
    }

    setSavingId(row.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/rewards/redemptions/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          fulfillment_notes: notesById[row.id]?.trim() || row.fulfillment_notes,
          cancel_reason: status === "cancelled" ? "Admin cancelled" : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Approve, fulfill, or cancel member redemptions. Cancel refunds credits and restores
          inventory.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as CrimsonCreditRedemptionStatus | "all")
            }
            className="rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status} className="bg-black">
                {status === "all" ? "All statuses" : formatRedemptionStatusLabel(status)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400 hover:border-white/20"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Loading redemptions…</p> : null}

      {!loading && rows.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-zinc-500">
          No redemptions match this filter.
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const busy = savingId === row.id;
          const refunded = row.status === "cancelled" && Boolean(row.refund_transaction_id);

          return (
            <div
              key={row.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <AdminUserIdentity
                    profile={{
                      id: row.user_id,
                      username: row.member_username,
                      display_name: row.member_display_name,
                    }}
                    showAvatar
                    compact
                  />
                  <p className="text-sm font-medium text-white">{row.reward_title}</p>
                  <p className="text-xs text-zinc-500">
                    {row.credits_spent.toLocaleString()} credits ·{" "}
                    {formatRewardCategoryLabel(row.reward_category)} ·{" "}
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                  {row.shirt_size ? (
                    <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                      Shirt size {row.shirt_size}
                    </p>
                  ) : null}
                  {refunded ? (
                    <p className="text-xs text-emerald-300">Credits refunded · inventory restored</p>
                  ) : null}
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] ${statusBadgeClass(row.status)}`}
                  >
                    {formatRedemptionStatusLabel(row.status)}
                  </span>
                </div>

                <div className="w-full lg:max-w-sm">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                      Fulfillment notes
                    </span>
                    <textarea
                      value={notesById[row.id] ?? row.fulfillment_notes ?? ""}
                      onChange={(e) =>
                        setNotesById((current) => ({ ...current, [row.id]: e.target.value }))
                      }
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    />
                  </label>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.status === "pending" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(row, "approved")}
                        className="rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-sky-200"
                      >
                        Approve
                      </button>
                    ) : null}
                    {row.status === "pending" || row.status === "approved" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(row, "fulfilled")}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-emerald-200"
                      >
                        Fulfill
                      </button>
                    ) : null}
                    {row.status !== "cancelled" && row.status !== "fulfilled" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void updateStatus(row, "cancelled")}
                        className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-[9px] uppercase tracking-[0.14em] text-red-300"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
