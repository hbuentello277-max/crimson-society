"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { isProfileSetupComplete } from "@/lib/profile";
import { logAuthSessionEvent } from "@/lib/auth/session-log";
import { POST_AUTH_SETUP_PATH, resolvePostAuthPath } from "@/lib/auth/post-auth-redirect";
import { supabase } from "@/lib/supabase";

/** Client-side post-login / post-session redirect (password login, existing session). */
export async function redirectAfterAuth(
  router: AppRouterInstance,
  userId: string,
  requestedNext?: string | null,
) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username, display_name, status")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (profile?.status === "deletion_pending") {
      logAuthSessionEvent("redirect-deletion-pending", { userId });
      router.replace("/deletion-pending");
      return;
    }

    const destination = resolvePostAuthPath(profile, requestedNext);
    logAuthSessionEvent("redirect-after-auth", { userId, requestedNext, destination });
    router.replace(destination);
  } catch {
    logAuthSessionEvent("redirect-after-auth-fallback-setup", { userId, requestedNext });
    router.replace(requestedNext ? resolvePostAuthPath(null, requestedNext) : POST_AUTH_SETUP_PATH);
  }
}
