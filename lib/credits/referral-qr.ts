import {
  REFERRAL_QR_BASE_OPTIONS,
  REFERRAL_QR_DISPLAY_WIDTH,
  REFERRAL_QR_DOWNLOAD_WIDTH,
} from "@/lib/credits/referral-qr-options";

export {
  REFERRAL_QR_BASE_OPTIONS,
  REFERRAL_QR_DISPLAY_WIDTH,
  REFERRAL_QR_DOWNLOAD_WIDTH,
  referralQrDownloadFilename,
} from "@/lib/credits/referral-qr-options";

type QrCodeModule = {
  toDataURL: (text: string, options?: Record<string, unknown>) => Promise<string>;
  toBuffer: (
    text: string,
    options?: Record<string, unknown>,
  ) => Promise<Buffer>;
};

async function loadQrCodeModule(): Promise<QrCodeModule> {
  const module = await import("qrcode");
  const candidate = (module.default ?? module) as QrCodeModule;
  if (typeof candidate.toDataURL !== "function" || typeof candidate.toBuffer !== "function") {
    throw new Error("The qrcode package did not load a usable encoder.");
  }
  return candidate;
}

export async function buildReferralQrDataUrl(
  signupUrl: string,
  width = REFERRAL_QR_DISPLAY_WIDTH,
) {
  const QRCode = await loadQrCodeModule();
  return QRCode.toDataURL(signupUrl, {
    ...REFERRAL_QR_BASE_OPTIONS,
    width,
  });
}

export async function buildReferralQrPngBlob(
  signupUrl: string,
  width = REFERRAL_QR_DOWNLOAD_WIDTH,
) {
  const QRCode = await loadQrCodeModule();
  const buffer = await QRCode.toBuffer(signupUrl, {
    ...REFERRAL_QR_BASE_OPTIONS,
    type: "png",
    width,
  });
  return new Blob([Uint8Array.from(buffer)], { type: "image/png" });
}
