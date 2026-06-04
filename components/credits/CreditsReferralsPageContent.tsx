"use client";

import { useEffect, useState } from "react";
import { CreditsPageShell } from "@/components/credits/CreditsPageShell";
import { MemberReferralCodeCard } from "@/components/credits/MemberReferralCodeCard";
import { useOwnReferralStats } from "@/hooks/useOwnReferralStats";
import { supabase } from "@/lib/supabase";

function RewardStatus({ awarded, pendingLabel, awardedLabel }: { awarded: boolean; pendingLabel: string; awardedLabel: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
        awarded ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-500"
      }`}
    >
      {awarded ? awardedLabel : pendingLabel}
    </span>
  );
}

export function CreditsReferralsPageContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setAuthLoading(false);
    }
    void loadUser();
  }, []);

  const { stats, loading, error } = useOwnReferralStats(Boolean(userId));

  const statItems = [
    { label: "Total referred", value: stats.total_referred },
    { label: "Signup rewards", value: stats.signup_rewards_earned },
    { label: "Blackcard rewards", value: stats.blackcard_rewards_earned },
    {
      label: "Referral credits earned",
      value: stats.total_referral_credits_earned,
    },
  ];

  return (
    <CreditsPageShell
      title="Referrals"
      subtitle="Share your code at signup. Rewards credit when referrals join and upgrade to Blackcard."
    >
      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <MemberReferralCodeCard referralCode={stats.referral_code} loading={authLoading || loading} />

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Referral stats</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {statItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{item.label}</p>
              <p className="mt-1 text-lg font-medium text-white">
                {authLoading || loading ? "—" : item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {stats.referred_users.length > 0 && (
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Referred members</h2>
          <ul className="mt-3 space-y-2">
            {stats.referred_users.map((person) => {
              const label =
                person.display_name?.trim() ||
                (person.username ? `@${person.username}` : "Crimson member");
              const handle = person.username ? `@${person.username}` : null;

              return (
                <li
                  key={person.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <p className="text-sm font-medium text-white">{label}</p>
                  {handle && person.display_name ? (
                    <p className="text-xs text-zinc-500">{handle}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <RewardStatus
                      awarded={person.signup_reward_awarded}
                      awardedLabel="Signup rewarded"
                      pendingLabel="Signup pending"
                    />
                    <RewardStatus
                      awarded={person.blackcard_reward_awarded}
                      awardedLabel="Blackcard rewarded"
                      pendingLabel="Blackcard pending"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </CreditsPageShell>
  );
}
