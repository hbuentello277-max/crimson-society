"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { loadActiveMembership } from "@/lib/blackcard/load-membership";
import { hasBlackcardAccess, type MembershipProfileFields, type MembershipRow } from "@/lib/membership";
import { supabase } from "@/lib/supabase";

export function useBlackcardAccess() {
  const { loading: authLoading, isAdmin } = useAuth();
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [profileFields, setProfileFields] = useState<MembershipProfileFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [row, profileResponse] = await Promise.all([
          loadActiveMembership(),
          supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return null;
            const { data } = await supabase
              .from("profiles")
              .select("is_premium, premium_tier, premium_expires_at, is_founding_blackcard, founding_blackcard_granted_at, membership_tier, blackcard_public")
              .eq("id", user.id)
              .maybeSingle();
            return (data as MembershipProfileFields | null) ?? null;
          }),
        ]);
        if (active) {
          setMembership(row);
          setProfileFields(profileResponse);
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
    hasAccess: hasBlackcardAccess(membership, isAdmin, { profile: profileFields, blackcardPublic: profileFields?.blackcard_public }),
    isAdmin,
    error,
  };
}
