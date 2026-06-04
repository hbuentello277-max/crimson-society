"use client";

import { useEffect, useState } from "react";
import { CreditsAccountOverview } from "@/components/credits/CreditsAccountOverview";
import { CreditsPageShell } from "@/components/credits/CreditsPageShell";
import { CreditsTransactionList } from "@/components/credits/CreditsTransactionList";
import { useCrimsonCreditTransactions } from "@/hooks/useCrimsonCreditTransactions";
import { useCrimsonCreditsAccount } from "@/hooks/useCrimsonCreditsAccount";
import { supabase } from "@/lib/supabase";

export function CreditsHistoryPageContent() {
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

  const { account, loading: accountLoading, error: accountError } = useCrimsonCreditsAccount(userId);
  const {
    transactions,
    loading: txLoading,
    loadingMore,
    hasMore,
    loadMore,
    error: txError,
  } = useCrimsonCreditTransactions(userId);

  const loading = authLoading || accountLoading;

  return (
    <CreditsPageShell
      title="Credits History"
      subtitle="Your balance, monthly progress, and full earn history."
    >
      {accountError || txError ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {accountError ?? txError}
        </p>
      ) : null}

      <CreditsAccountOverview account={account} loading={loading} />

      <section>
        <h2 className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Transaction history</h2>
        <div className="mt-3">
          <CreditsTransactionList
            transactions={transactions}
            loading={authLoading || txLoading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        </div>
      </section>
    </CreditsPageShell>
  );
}
