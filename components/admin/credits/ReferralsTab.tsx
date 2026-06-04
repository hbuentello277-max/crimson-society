"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminUserIdentity } from "@/components/admin/credits/AdminUserIdentity";
import { TechnicalDetailsToggle } from "@/components/admin/credits/TechnicalDetailsToggle";
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
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={`${row.referrer_id}-${row.referred_user_id}`}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Referrer</p>
                  <div className="mt-2">
                    <AdminUserIdentity
                      profile={{
                        id: row.referrer_id,
                        username: row.referrer_username,
                        display_name: row.referrer_display_name,
                        avatar_url: row.referrer_avatar_url,
                      }}
                    />
                    {row.referral_code ? (
                      <p className="mt-2 font-mono text-xs text-zinc-500">Code: {row.referral_code}</p>
                    ) : null}
                    <TechnicalDetailsToggle
                      items={[{ label: "Referrer ID", value: row.referrer_id }]}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Referred member</p>
                  <div className="mt-2">
                    <AdminUserIdentity
                      profile={{
                        id: row.referred_user_id,
                        username: row.referred_username,
                        display_name: row.referred_display_name,
                        avatar_url: row.referred_avatar_url,
                      }}
                    />
                    <TechnicalDetailsToggle
                      items={[{ label: "Referred user ID", value: row.referred_user_id }]}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                <StatusBadge
                  ok={row.signup_reward_awarded}
                  label={row.signup_reward_awarded ? "Signup awarded" : "Signup pending"}
                />
                <StatusBadge
                  ok={row.blackcard_reward_awarded}
                  label={row.blackcard_reward_awarded ? "Blackcard awarded" : "Blackcard pending"}
                />
                {row.subscription_status ? (
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Subscription: {row.subscription_status}
                  </span>
                ) : null}
                {row.premium_tier ? (
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Tier: {row.premium_tier}
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <p className="rounded-2xl border border-white/10 py-8 text-center text-sm text-zinc-600">
              No referrals yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
