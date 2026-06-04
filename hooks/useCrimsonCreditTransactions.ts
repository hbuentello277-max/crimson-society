"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrimsonCreditTransactionRow } from "@/lib/credits/types";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 50;

export function useCrimsonCreditTransactions(userId: string | null | undefined) {
  const [transactions, setTransactions] = useState<CrimsonCreditTransactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!userId) {
        setTransactions([]);
        setHasMore(false);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { data, error: queryError } = await supabase
        .from("crimson_credit_transactions")
        .select("id, amount, transaction_type, reason, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      const rows = (data ?? []) as CrimsonCreditTransactionRow[];
      setTransactions((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
      setLoading(false);
      setLoadingMore(false);
    },
    [userId],
  );

  const refresh = useCallback(() => fetchPage(0, false), [fetchPage]);

  useEffect(() => {
    void fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      void fetchPage(transactions.length, true);
    }
  }, [fetchPage, hasMore, loading, loadingMore, transactions.length]);

  return { transactions, loading, loadingMore, error, hasMore, loadMore, refresh };
}
