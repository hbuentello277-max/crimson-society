const CONFIGURED_SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
  process.env.SUPPORT_EMAIL?.trim();

/** Fallback when no support address is configured in env. */
export const FALLBACK_SUPPORT_EMAIL = "hbuentello277@gmail.com";

export const SUPPORT_EMAIL = CONFIGURED_SUPPORT_EMAIL || FALLBACK_SUPPORT_EMAIL;

export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
