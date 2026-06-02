"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import { POST_AUTH_HOME_PATH, POST_AUTH_SETUP_PATH } from "@/lib/auth/post-auth-redirect";

/** Client-side post-login / post-session redirect (password login, existing session). */
export async function redirectAfterAuth(router: AppRouterInstance, userId: string) {
  try {
    const complete = await requireCompleteProfile(userId);
    router.replace(complete ? POST_AUTH_HOME_PATH : POST_AUTH_SETUP_PATH);
  } catch {
    router.replace(POST_AUTH_SETUP_PATH);
  }
}
