"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/LanguageProvider";
import { CrimsonRewardsIcon } from "@/components/credits/CrimsonRewardsIcon";
import { CreditRedemptionHistoryList } from "@/components/credits/CreditRedemptionHistoryList";
import { CreditsPageShell } from "@/components/credits/CreditsPageShell";
import { CreditsRewardsSummary } from "@/components/credits/CreditsRewardsSummary";
import { useCreditRewardsPage } from "@/hooks/useCreditRewardsPage";
import { supabase } from "@/lib/supabase";

/** Internal redemption history — not linked from Profile Menu. */
export function CreditsRewardsPageContent() {
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

  const enabled = Boolean(userId) && !authLoading;
  const { summary, redemptions, loading, error } = useCreditRewardsPage(enabled);

  return (
    <CreditsPageShell
      title={copy.redemptionHistoryTitle}
      subtitle={copy.redemptionHistorySubtitle}
    >
      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <Link
        href="/shop?tab=credit-rewards"
        className="flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-[#b4141e]/45 bg-[#b4141e]/12 px-5 text-xs uppercase tracking-[0.2em] text-[#f1c3c7]"
      >
        <CrimsonRewardsIcon size={20} />
        {copy.browseRewards}
      </Link>

      <CreditsRewardsSummary summary={summary} loading={authLoading || loading} />

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">{copy.yourRedemptions}</h2>
        <div className="mt-3">
          <CreditRedemptionHistoryList redemptions={redemptions} loading={authLoading || loading} />
        </div>
      </section>
    </CreditsPageShell>
  );
}
