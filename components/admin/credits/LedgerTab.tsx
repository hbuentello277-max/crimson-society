"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminUserIdentity } from "@/components/admin/credits/AdminUserIdentity";
import { TechnicalDetailsToggle } from "@/components/admin/credits/TechnicalDetailsToggle";
import type { AdminCreditLedgerRow } from "@/lib/credits/admin-types";

function ReferredUserCell({ row }: { row: AdminCreditLedgerRow }) {
  if (!row.referred_user_id) {
    return <span className="text-zinc-600">—</span>;
  }

  if (!row.referred_username && !row.referred_display_name) {
    return (
      <TechnicalDetailsToggle
        items={[{ label: "Referred user ID", value: row.referred_user_id }]}
      />
    );
  }

  return (
    <div>
      <AdminUserIdentity
        profile={{
          id: row.referred_user_id,
          username: row.referred_username,
          display_name: row.referred_display_name,
        }}
        showAvatar={false}
        compact
      />
      <TechnicalDetailsToggle items={[{ label: "Referred user ID", value: row.referred_user_id }]} />
    </div>
  );
}

export function LedgerTab() {
  const [rows, setRows] = useState<AdminCreditLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/credits/ledger?limit=${limit}&offset=${offset}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load ledger");
      }
      setRows(data.ledger ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">All credit transactions (newest first).</p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={offset === 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-40"
          >
            Newer
          </button>
          <button
            type="button"
            disabled={rows.length < limit || loading}
            onClick={() => setOffset((o) => o + limit)}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-400 hover:text-white disabled:opacity-40"
          >
            Older
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {loading && <p className="text-sm text-zinc-500">Loading ledger…</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/30 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Date</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">User</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Amount</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Reason</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Ride</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Referred</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 text-zinc-300">
                  <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-500">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <AdminUserIdentity
                      profile={{
                        id: row.user_id,
                        username: row.username,
                        display_name: row.display_name,
                        avatar_url: row.avatar_url,
                      }}
                    />
                    <TechnicalDetailsToggle
                      items={[
                        { label: "User ID", value: row.user_id },
                        { label: "Transaction ID", value: row.id },
                      ]}
                    />
                  </td>
                  <td className={`px-3 py-2 align-top font-medium ${row.amount < 0 ? "text-red-300" : "text-emerald-300"}`}>
                    {row.amount > 0 ? "+" : ""}
                    {row.amount}
                  </td>
                  <td className="px-3 py-2 align-top">{row.transaction_type}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 align-top" title={row.reason ?? undefined}>
                    {row.reason ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {row.ride_id ? (
                      <TechnicalDetailsToggle items={[{ label: "Ride ID", value: row.ride_id }]} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <ReferredUserCell row={row} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-zinc-600">
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
