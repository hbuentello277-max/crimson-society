"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminCreditReferralRow } from "@/lib/credits/admin-types";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
        ok ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-500"
      }`}
    >
      {label}
    </span>
  );
}

export function ReferralsTab() {
  const [rows, setRows] = useState<AdminCreditReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/credits/referrals");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load referrals");
      }
      setRows(data.referrals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">Referral relationships and reward status (up to 500 recent).</p>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {loading && <p className="text-sm text-zinc-500">Loading referrals…</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/30 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Referrer</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Code</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Referred user</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Signup reward</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Blackcard reward</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Subscription</th>
                <th className="px-3 py-2 font-normal uppercase tracking-wider">Tier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.referrer_id}-${row.referred_user_id}`}
                  className="border-b border-white/5 text-zinc-300"
                >
                  <td className="px-3 py-2">
                    {row.referrer_username ? `@${row.referrer_username}` : row.referrer_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-400">{row.referral_code ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.referred_username ? `@${row.referred_username}` : row.referred_user_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge ok={row.signup_reward_awarded} label={row.signup_reward_awarded ? "Awarded" : "Pending"} />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      ok={row.blackcard_reward_awarded}
                      label={row.blackcard_reward_awarded ? "Awarded" : "Pending"}
                    />
                  </td>
                  <td className="px-3 py-2">{row.subscription_status ?? "—"}</td>
                  <td className="px-3 py-2">{row.premium_tier ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-zinc-600">
                    No referrals yet.
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
