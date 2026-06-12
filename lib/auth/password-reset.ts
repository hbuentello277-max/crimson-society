export const PASSWORD_RESET_PATH = "/reset-password";

/** Supabase password-reset email lands on auth callback, then continues to reset UI. */
export function buildPasswordResetRedirectUrl(origin: string) {
  const next = encodeURIComponent(PASSWORD_RESET_PATH);
  return `${origin}/auth/callback?next=${next}`;
}
