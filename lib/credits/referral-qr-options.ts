import { referralCodeLookupKey } from "@/lib/credits/referral-code";

export const REFERRAL_QR_DISPLAY_WIDTH = 320;
export const REFERRAL_QR_DOWNLOAD_WIDTH = 1200;

export const REFERRAL_QR_BASE_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
  color: {
    dark: "#120608",
    light: "#FFFFFF",
  },
};

export function referralQrDownloadFilename(referralCode: string) {
  const key = referralCodeLookupKey(referralCode) || "REFERRAL";
  return `crimson-society-referral-${key.toLowerCase()}.png`;
}
