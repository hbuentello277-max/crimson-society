import {
  buildQrDataUrl,
  buildQrPngBlob,
} from "@/lib/credits/referral-qr";
import { REFERRAL_QR_DOWNLOAD_WIDTH } from "@/lib/credits/referral-qr-options";

export async function copySignupLink(signupUrl: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return { ok: false as const, error: "Clipboard is unavailable." };
  }

  try {
    await navigator.clipboard.writeText(signupUrl);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Could not copy link." };
  }
}

/** @deprecated Use copySignupLink */
export async function copyReferralSignupLink(signupUrl: string) {
  return copySignupLink(signupUrl);
}

export async function shareQrImage(input: {
  targetUrl: string;
  filename: string;
  shareTitle: string;
  shareText: string;
}) {
  if (typeof navigator === "undefined") {
    return { ok: false as const, error: "Share is only available in the browser." };
  }

  const blob = await buildQrPngBlob(input.targetUrl, REFERRAL_QR_DOWNLOAD_WIDTH);
  const file = new File([blob], input.filename, {
    type: "image/png",
  });

  if (typeof navigator.share === "function") {
    try {
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: input.shareTitle,
          text: input.shareText,
          files: [file],
        });
        return { ok: true as const, mode: "image" as const };
      }

      await navigator.share({
        title: input.shareTitle,
        text: input.shareText,
        url: input.targetUrl,
      });
      return { ok: true as const, mode: "link" as const };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { ok: true as const, canceled: true as const };
      }
    }
  }

  return { ok: false as const, error: "Native share is unavailable on this device." };
}

export async function downloadQrImage(input: {
  targetUrl: string;
  filename: string;
}) {
  const dataUrl = await buildQrDataUrl(input.targetUrl, REFERRAL_QR_DOWNLOAD_WIDTH);
  if (typeof document === "undefined") {
    return { ok: false as const, error: "Download is only available in the browser." };
  }

  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = input.filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return { ok: true as const };
}
