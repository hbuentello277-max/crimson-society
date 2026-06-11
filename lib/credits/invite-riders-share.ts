import { buildReferralSignupUrl } from "@/lib/credits/referral-link";

export function inviteRidersSiteUrl(origin?: string) {
  if (origin?.trim()) return origin.trim().replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://crimson-society.com";
}

export function buildInviteRidersShareMessage(referralCode: string, origin?: string) {
  const siteUrl = inviteRidersSiteUrl(origin);
  return `Join me on Crimson Society.\n\nUse my referral code: ${referralCode}\n\n${siteUrl}`;
}

export function buildInviteRidersShareUrl(referralCode: string, origin?: string) {
  return buildReferralSignupUrl(referralCode, inviteRidersSiteUrl(origin)) ?? inviteRidersSiteUrl(origin);
}
