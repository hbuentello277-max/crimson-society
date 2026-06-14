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
  appQrDownloadFilename,
} from "@/lib/credits/referral-qr-options";

export type QrCodeModule = {
  toDataURL: (text: string, options?: Record<string, unknown>) => Promise<string>;
  toBuffer?: (
    text: string,
    options?: Record<string, unknown>,
  ) => Promise<Buffer>;
};

async function loadQrCodeModule(): Promise<QrCodeModule> {
  const module = await import("qrcode");
  const candidate = (module.default ?? module) as QrCodeModule;
  if (typeof candidate.toDataURL !== "function") {
    throw new Error("The qrcode package did not load a usable encoder.");
  }
  return candidate;
}

async function dataUrlToPngBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

export async function buildQrDataUrlWithModule(
  targetUrl: string,
  QRCode: QrCodeModule,
  width = REFERRAL_QR_DISPLAY_WIDTH,
) {
  return QRCode.toDataURL(targetUrl, {
    ...REFERRAL_QR_BASE_OPTIONS,
    width,
  });
}

export async function buildQrPngBlobWithModule(
  targetUrl: string,
  QRCode: QrCodeModule,
  width = REFERRAL_QR_DOWNLOAD_WIDTH,
) {
  if (typeof QRCode.toBuffer === "function") {
    const buffer = await QRCode.toBuffer(targetUrl, {
      ...REFERRAL_QR_BASE_OPTIONS,
      type: "png",
      width,
    });
    return new Blob([Uint8Array.from(buffer)], { type: "image/png" });
  }

  const dataUrl = await buildQrDataUrlWithModule(targetUrl, QRCode, width);
  return dataUrlToPngBlob(dataUrl);
}

export async function buildQrDataUrl(
  targetUrl: string,
  width = REFERRAL_QR_DISPLAY_WIDTH,
) {
  const QRCode = await loadQrCodeModule();
  return buildQrDataUrlWithModule(targetUrl, QRCode, width);
}

export async function buildQrPngBlob(
  targetUrl: string,
  width = REFERRAL_QR_DOWNLOAD_WIDTH,
) {
  const QRCode = await loadQrCodeModule();
  return buildQrPngBlobWithModule(targetUrl, QRCode, width);
}

export async function buildReferralQrDataUrl(
  signupUrl: string,
  width = REFERRAL_QR_DISPLAY_WIDTH,
) {
  return buildQrDataUrl(signupUrl, width);
}

export async function buildReferralQrPngBlob(
  signupUrl: string,
  width = REFERRAL_QR_DOWNLOAD_WIDTH,
) {
  return buildQrPngBlob(signupUrl, width);
}
