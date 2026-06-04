"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminCreditBalanceRow } from "@/lib/credits/admin-types";

export function BalancesTab() {
  const [rows, setRows] = useState<AdminCreditBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/credits/balances");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load balances");
      }
      setRows(data.balances ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load balances");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">User balances and monthly cap usage (admin adjustments excluded from monthly earned).</p>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {loading && <p className="text-sm text-zinc-500">Loading balances…</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/30 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">User</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Balance</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Lifetime earned</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Lifetime spent</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Monthly earned</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Cap</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id} className="border-b border-white/5 text-zinc-300">
                  <td className="px-3 py-2">
                    {row.username ? `@${row.username}` : row.display_name ?? row.user_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 font-medium text-white">{row.credits_balance}</td>
                  <td className="px-3 py-2">{row.lifetime_credits_earned}</td>
                  <td className="px-3 py-2">{row.lifetime_credits_spent}</td>
                  <td className="px-3 py-2">
                    {row.monthly_earned}
                    <span className="text-zinc-600"> / {row.monthly_cap}</span>
                  </td>
                  <td className="px-3 py-2">
                    {row.monthly_cap > 0
                      ? `${Math.round((row.monthly_earned / row.monthly_cap) * 100)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-600">
                    No credit balances yet.
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
