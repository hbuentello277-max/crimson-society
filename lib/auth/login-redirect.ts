import { isSafeInternalPath } from "@/lib/auth/post-auth-redirect";

/** Build login URL preserving the in-app destination for post-auth redirect. */
export function buildLoginRedirectPath(returnPath: string) {
  const safePath = isSafeInternalPath(returnPath) ? returnPath : "/dashboard";
  return `/login?next=${encodeURIComponent(safePath)}`;
}

export function resolveReturnPathFromWindow(): string {
  if (typeof window === "undefined") return "/dashboard";
  const path = `${window.location.pathname}${window.location.search}`;
  return isSafeInternalPath(path) ? path : "/dashboard";
}
