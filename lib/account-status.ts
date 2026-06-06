export const RESTRICTED_ACCOUNT_STATUSES = [
  "suspended",
  "blocked",
  "banned",
  "limited",
  "inactive",
] as const;

export function isRestrictedAccountStatus(status: string | null | undefined) {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized !== "active" && normalized !== "deletion_pending";
}

export const RESTRICTED_ACCOUNT_ALLOWED_PATHS = [
  "/account-restricted",
  "/account-deletion",
  "/privacy",
  "/terms",
  "/community-guidelines",
  "/safety",
  "/support",
  "/login",
  "/auth/callback",
] as const;

export function isPathAllowedForRestrictedAccount(pathname: string) {
  return RESTRICTED_ACCOUNT_ALLOWED_PATHS.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
}

export function restrictedAccountStatusLabel(status: string | null | undefined) {
  if (!status) return "Restricted";
  return status.replace(/_/g, " ");
}
