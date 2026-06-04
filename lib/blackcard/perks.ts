/** Blackcard marketing perks — no multipliers or unimplemented bonus credit promises. */

export const BLACKCARD_MEMBERSHIP_PERKS = [
  "Earn Crimson Credits through meets and referrals",
  "Redeem future Blackcard member rewards (coming soon)",
  "Early merch access",
  "Blackcard merch discount",
  "Exclusive meets and ride chats",
  "Limited inventory access",
  "Merch voting access",
] as const;

/** Active Blackcard perks aligned with long-term product vision. */
export const BLACKCARD_ACTIVE_PERKS = [...BLACKCARD_MEMBERSHIP_PERKS] as const;

/** Deprecated perks — removed from marketing and roadmap. */
export const BLACKCARD_DEPRECATED_PERKS = [
  "Favorite rider alerts",
  "Priority meet access",
  "Crimson Credits multipliers",
  "Crimson Credits bonuses",
] as const;

export const FOUNDING_BLACKCARD_PERKS = [
  "Lifetime Blackcard access",
  "Founding member badge",
  "Lifetime early merch access",
  "Merch voting rights",
  "Never pays subscription",
  "Redeem future Blackcard member rewards (coming soon)",
] as const;

export const BLACKCARD_PAYWALL_PERKS = [...BLACKCARD_MEMBERSHIP_PERKS] as const;

export const BLACKCARD_CREDITS_TAGLINE =
  "Everyone can earn Crimson Credits. Blackcard and Founding Blackcard members can redeem credits for future member rewards (coming soon).";

export const BLACKCARD_HERO_DESCRIPTION =
  "Blackcard members unlock Crimson Credits redemption, early merch access, exclusive meets, and future member rewards.";
