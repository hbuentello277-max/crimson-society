"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/LanguageProvider";
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
  const { dictionary } = useI18n();
  const copy = dictionary.credits;
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
    { label: copy.totalReferred, value: stats.total_referred },
    { label: copy.signupRewards, value: stats.signup_rewards_earned },
    { label: copy.blackcardRewards, value: stats.blackcard_rewards_earned },
    {
      label: copy.referralCreditsEarned,
      value: stats.total_referral_credits_earned,
    },
  ];

  const blackcardConversions = stats.referred_users.filter(
    (person) => person.blackcard_reward_awarded,
  ).length;
  const pendingSignups = stats.referred_users.filter(
    (person) => !person.signup_reward_awarded,
  ).length;

  return (
    <CreditsPageShell
      title={copy.inviteTitle}
      subtitle={copy.inviteSubtitle}
    >
      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <MemberReferralCodeCard referralCode={stats.referral_code} loading={authLoading || loading} />

      <Link
        href="/profile/credits/referrals/qr"
        className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/[0.02] px-4 py-4 transition hover:border-[#b4141e]/40 hover:bg-[#b4141e]/5"
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{copy.openMyQrCode}</p>
          <p className="mt-1 text-sm text-zinc-300">{copy.myQrCodeSubtitle}</p>
        </div>
        <span className="text-lg text-zinc-500" aria-hidden>
          →
        </span>
      </Link>

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{copy.referralProgress}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{copy.blackcardConversions}</p>
            <p className="mt-1 text-lg font-medium text-white">
              {authLoading || loading ? "—" : blackcardConversions}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{copy.pendingSignups}</p>
            <p className="mt-1 text-lg font-medium text-white">
              {authLoading || loading ? "—" : pendingSignups}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{copy.referralStats}</p>
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
          <h2 className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">{copy.referredMembers}</h2>
          <ul className="mt-3 space-y-2">
            {stats.referred_users.map((person) => {
              const label =
                person.display_name?.trim() ||
                (person.username ? `@${person.username}` : copy.crimsonMember);
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
                      awardedLabel={copy.signupRewarded}
                      pendingLabel={copy.signupPending}
                    />
                    <RewardStatus
                      awarded={person.blackcard_reward_awarded}
                      awardedLabel={copy.blackcardRewarded}
                      pendingLabel={copy.blackcardPending}
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
