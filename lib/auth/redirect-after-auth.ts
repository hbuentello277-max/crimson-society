"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { isProfileSetupComplete } from "@/lib/profile";
import { POST_AUTH_HOME_PATH, POST_AUTH_SETUP_PATH } from "@/lib/auth/post-auth-redirect";
import { supabase } from "@/lib/supabase";

/** Client-side post-login / post-session redirect (password login, existing session). */
export async function redirectAfterAuth(router: AppRouterInstance, userId: string) {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("username, display_name, status")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;

    if (profile?.status === "deletion_pending") {
      router.replace("/deletion-pending");
      return;
    }

    const complete = isProfileSetupComplete(profile);
    router.replace(complete ? POST_AUTH_HOME_PATH : POST_AUTH_SETUP_PATH);
  } catch {
    router.replace(POST_AUTH_SETUP_PATH);
  }
}
