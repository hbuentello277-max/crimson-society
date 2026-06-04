import type { CrimsonCreditsAccount } from "@/lib/credits/types";
import { formatCreditsRewardValueUsd } from "@/lib/credits/config";

type Props = {
  account: CrimsonCreditsAccount;
  loading?: boolean;
  compact?: boolean;
};

export function CreditsAccountOverview({ account, loading = false, compact = false }: Props) {
  const monthlyCap = account.monthly_cap;
  const monthlyEarned = account.monthly_earned;
  const progress = monthlyCap > 0 ? Math.min(100, (monthlyEarned / monthlyCap) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#b4141e]/25 bg-gradient-to-br from-[#120608] via-[#0a0a0b] to-[#090909] p-4 shadow-[0_16px_50px_-36px_rgba(180,20,30,0.55)]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Current balance</p>
          <p className="mt-1 font-serif text-3xl text-white">
            {loading ? "—" : `${account.credits_balance}`}
            <span className="ml-1 text-sm font-normal text-zinc-500">credits</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {loading ? "—" : `≈ ${formatCreditsRewardValueUsd(account.credits_balance)} reward value`}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Monthly earned</p>
          <p className="mt-1 font-serif text-2xl text-white">
            {loading ? "—" : `${monthlyEarned} / ${monthlyCap}`}
          </p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={monthlyEarned}
            aria-valuemin={0}
            aria-valuemax={monthlyCap}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7a1018] to-[#b4141e] transition-all"
              style={{ width: loading ? "0%" : `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/8 pt-4">
          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Lifetime earned</p>
            <p className="mt-1 text-lg font-medium text-zinc-200">
              {loading ? "—" : account.lifetime_credits_earned}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Lifetime spent</p>
            <p className="mt-1 text-lg font-medium text-zinc-200">
              {loading ? "—" : account.lifetime_credits_spent}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
