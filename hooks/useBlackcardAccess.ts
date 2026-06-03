"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { loadActiveMembership } from "@/lib/blackcard/load-membership";
import { hasBlackcardAccess, type MembershipRow } from "@/lib/membership";

export function useBlackcardAccess() {
  const { loading: authLoading, isAdmin } = useAuth();
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const row = await loadActiveMembership();
        if (active) {
          setMembership(row);
        }
      } catch (loadError) {
        console.error(loadError);
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Blackcard access.",
          );
          setMembership(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [authLoading]);

  return {
    loading: loading || authLoading,
    membership,
    hasAccess: hasBlackcardAccess(membership, isAdmin),
    isAdmin,
    error,
  };
}
