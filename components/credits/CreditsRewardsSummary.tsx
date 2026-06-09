import { CrimsonRewardsIcon } from "@/components/credits/CrimsonRewardsIcon";
import type { CreditsRewardsSummary } from "@/lib/credits/rewards-api-types";
import {
  CRIMSON_CREDITS_MONTHLY_REDEMPTION_VALUE_USD,
  formatCreditsRewardValueUsd,
} from "@/lib/credits/config";

type Props = {
  summary: CreditsRewardsSummary;
  loading?: boolean;
};

export function CreditsRewardsSummary({ summary, loading = false }: Props) {
  const cashProgress =
    summary.monthly_cash_redemption_cap > 0
      ? Math.min(
          100,
          (summary.monthly_cash_redemption_used / summary.monthly_cash_redemption_cap) * 100,
        )
      : 0;

  const capUsd = CRIMSON_CREDITS_MONTHLY_REDEMPTION_VALUE_USD.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#b4141e]/25 bg-gradient-to-br from-[#120608] via-[#0a0a0b] to-[#090909] p-4 shadow-[0_16px_50px_-36px_rgba(180,20,30,0.55)]">
      <div className="mb-3 flex items-center gap-2">
        <CrimsonRewardsIcon size={20} />
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">Rewards balance</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Current balance</p>
          <p className="mt-1 font-serif text-3xl text-white">
            {loading ? "—" : summary.credits_balance.toLocaleString()}
            <span className="ml-1 text-sm font-normal text-zinc-500">credits</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {loading
              ? "—"
              : `Stored reward value ≈ ${formatCreditsRewardValueUsd(summary.credits_balance)}`}
          </p>
          <p className="mt-2 text-[10px] leading-4 text-zinc-600">Credits never expire.</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            Monthly store credit redemption
          </p>
          <p className="mt-1 font-serif text-2xl text-white">
            {loading
              ? "—"
              : `${summary.monthly_cash_redemption_used} / ${summary.monthly_cash_redemption_cap}`}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {loading ? "—" : `Store credit rewards only · cap ${capUsd}`}
          </p>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={summary.monthly_cash_redemption_used}
            aria-valuemin={0}
            aria-valuemax={summary.monthly_cash_redemption_cap}
            aria-label="Monthly store credit redemption usage"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7a1018] to-[#b4141e] transition-all"
              style={{ width: loading ? "0%" : `${cashProgress}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
