"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/LanguageProvider";
import { CreditsPageShell } from "@/components/credits/CreditsPageShell";
import { ReferralQrPanel } from "@/components/credits/ReferralQrPanel";
import { useOwnReferralStats } from "@/hooks/useOwnReferralStats";
import { supabase } from "@/lib/supabase";

export function ReferralQrPageContent() {
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

  return (
    <CreditsPageShell title={copy.myQrCodeTitle} subtitle={copy.myQrCodeSubtitle}>
      <Link
        href="/profile/credits/referrals"
        className="inline-flex text-[10px] uppercase tracking-[0.24em] text-zinc-500 transition hover:text-[#e87a82]"
      >
        {copy.backToReferrals}
      </Link>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <ReferralQrPanel
        referralCode={stats.referral_code}
        loading={authLoading || loading}
      />
    </CreditsPageShell>
  );
}
