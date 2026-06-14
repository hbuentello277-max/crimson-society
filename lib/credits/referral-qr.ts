import QRCode from "qrcode";
import { normalizeReferralCodeInput } from "@/lib/credits/referral-code";

export const REFERRAL_QR_DISPLAY_WIDTH = 320;
export const REFERRAL_QR_DOWNLOAD_WIDTH = 1200;

export const REFERRAL_QR_BASE_OPTIONS = {
  errorCorrectionLevel: "H" as const,
  margin: 2,
  color: {
    dark: "#120608FF",
    light: "#FFFFFFFF",
  },
};

export function referralQrDownloadFilename(referralCode: string) {
  const normalized = normalizeReferralCodeInput(referralCode) ?? "referral";
  return `crimson-society-referral-${normalized.toLowerCase()}.png`;
}

export async function buildReferralQrDataUrl(
  signupUrl: string,
  width = REFERRAL_QR_DISPLAY_WIDTH,
) {
  return QRCode.toDataURL(signupUrl, {
    ...REFERRAL_QR_BASE_OPTIONS,
    width,
  });
}

export async function buildReferralQrPngBlob(
  signupUrl: string,
  width = REFERRAL_QR_DOWNLOAD_WIDTH,
) {
  const buffer = await QRCode.toBuffer(signupUrl, {
    ...REFERRAL_QR_BASE_OPTIONS,
    type: "png",
    width,
  });
  return new Blob([Uint8Array.from(buffer)], { type: "image/png" });
}
