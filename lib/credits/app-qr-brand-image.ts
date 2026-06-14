import { PUBLIC_APP_SIGNUP_URL } from "@/lib/credits/referral-public-origin";
import { buildQrDataUrl } from "@/lib/credits/referral-qr";
import { REFERRAL_QR_BASE_OPTIONS } from "@/lib/credits/referral-qr-options";

export type AppQrBrandCopy = {
  heading: string;
  slogan: string;
  targetUrl: string;
};

export const BRANDED_APP_QR_EXPORT_WIDTH = 1200;

export function brandedAppQrCanvasHeight(width: number) {
  return Math.round(width * 1.28);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load QR image."));
    image.src = src;
  });
}

export async function buildBrandedAppQrPngBlob(
  copy: AppQrBrandCopy,
  width = BRANDED_APP_QR_EXPORT_WIDTH,
) {
  if (typeof document === "undefined") {
    throw new Error("Branded app QR export requires a browser canvas.");
  }

  const canvas = document.createElement("canvas");
  const height = brandedAppQrCanvasHeight(width);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize branded app QR canvas.");
  }

  const padding = Math.round(width * 0.08);
  const qrSize = Math.round(width * 0.56);
  const headingSize = Math.round(width * 0.055);
  const sloganSize = Math.round(width * 0.034);
  const urlSize = Math.round(width * 0.028);

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#120608";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `600 ${headingSize}px Georgia, "Times New Roman", serif`;
  ctx.fillText(copy.heading, width / 2, padding);

  ctx.fillStyle = "#4B5563";
  ctx.font = `500 ${sloganSize}px Georgia, "Times New Roman", serif`;
  ctx.fillText(copy.slogan, width / 2, padding + headingSize * 1.55);

  const qrDataUrl = await buildQrDataUrl(copy.targetUrl, qrSize);
  const qrImage = await loadImage(qrDataUrl);
  const qrX = Math.round((width - qrSize) / 2);
  const qrY = padding + headingSize * 1.55 + sloganSize * 2.1;
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#6B7280";
  ctx.font = `500 ${urlSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif`;
  const urlY = qrY + qrSize + Math.round(width * 0.05);
  ctx.fillText(copy.targetUrl, width / 2, urlY);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/png");
  });

  if (!blob) {
    throw new Error("Could not export branded app QR image.");
  }

  return blob;
}

export function defaultAppQrBrandCopy(input: {
  heading: string;
  slogan: string;
}) {
  return {
    heading: input.heading,
    slogan: input.slogan,
    targetUrl: PUBLIC_APP_SIGNUP_URL,
  };
}

export function brandedAppQrUsesHighErrorCorrection() {
  return REFERRAL_QR_BASE_OPTIONS.errorCorrectionLevel === "H";
}
