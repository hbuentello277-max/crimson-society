"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isOwnerFromProfile } from "@/lib/nexus/auth";

type OwnerGateState = {
  loading: boolean;
  isOwner: boolean;
  userId: string | null;
};

/**
 * Client-side owner gate for future Nexus UI.
 * Redirects unauthenticated users to /login and non-owners to /profile.
 */
export function useOwnerGate(options?: { redirect?: boolean }) {
  const router = useRouter();
  const shouldRedirect = options?.redirect !== false;
  const [state, setState] = useState<OwnerGateState>({
    loading: true,
    isOwner: false,
    userId: null,
  });

  useEffect(() => {
    let active = true;

    async function verify() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        setState({ loading: false, isOwner: false, userId: null });
        if (shouldRedirect) {
          router.replace("/login");
        }
        return;
      }

      const [{ data: rpcOwner }, { data: profile }] = await Promise.all([
        supabase.rpc("is_platform_owner", { target_user_id: user.id }),
        supabase
          .from("profiles")
          .select("role, status, is_platform_owner")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      const ownerAccess =
        rpcOwner === true ||
        isOwnerFromProfile(
          profile as { status?: string | null; is_platform_owner?: boolean | null } | null,
        );

      if (!active) return;

      setState({
        loading: false,
        isOwner: ownerAccess,
        userId: user.id,
      });

      if (shouldRedirect && !ownerAccess) {
        router.replace("/profile");
      }
    }

    void verify();

    return () => {
      active = false;
    };
  }, [router, shouldRedirect]);

  return state;
}
