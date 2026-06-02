import { isProfileSetupComplete } from "@/lib/profile";

export const POST_AUTH_SETUP_PATH = "/profile/setup";
export const POST_AUTH_HOME_PATH = "/dashboard";

export type PostAuthProfile = {
  username?: string | null;
  display_name?: string | null;
};

/** Safe relative in-app paths only (no open redirects). */
export function isSafeInternalPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

/**
 * After sign-in or email verification:
 * incomplete profile → setup; complete → dashboard (or safe explicit `next`).
 */
export function resolvePostAuthPath(
  profile: PostAuthProfile | null | undefined,
  requestedNext?: string | null,
) {
  if (!isProfileSetupComplete(profile)) {
    return POST_AUTH_SETUP_PATH;
  }

  const next = requestedNext?.trim();
  if (next && isSafeInternalPath(next)) {
    return next;
  }

  return POST_AUTH_HOME_PATH;
}
