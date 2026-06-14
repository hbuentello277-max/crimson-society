import { referralShareText } from "@/lib/credits/referral-link";
import {
  buildReferralQrDataUrl,
  buildReferralQrPngBlob,
  referralQrDownloadFilename,
  REFERRAL_QR_DOWNLOAD_WIDTH,
} from "@/lib/credits/referral-qr";

export async function copyReferralSignupLink(signupUrl: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return { ok: false as const, error: "Clipboard is unavailable." };
  }

  try {
    await navigator.clipboard.writeText(signupUrl);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Could not copy referral link." };
  }
}

export async function shareReferralQrImage(input: {
  signupUrl: string;
  referralCode: string;
  shareTitle: string;
}) {
  if (typeof navigator === "undefined") {
    return { ok: false as const, error: "Share is only available in the browser." };
  }

  const blob = await buildReferralQrPngBlob(input.signupUrl, REFERRAL_QR_DOWNLOAD_WIDTH);
  const file = new File([blob], referralQrDownloadFilename(input.referralCode), {
    type: "image/png",
  });
  const shareText = referralShareText(input.referralCode, input.signupUrl);

  if (typeof navigator.share === "function") {
    try {
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: input.shareTitle,
          text: shareText,
          files: [file],
        });
        return { ok: true as const, mode: "image" as const };
      }

      await navigator.share({
        title: input.shareTitle,
        text: shareText,
        url: input.signupUrl,
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

export async function downloadReferralQrImage(signupUrl: string, referralCode: string) {
  const dataUrl = await buildReferralQrDataUrl(signupUrl, REFERRAL_QR_DOWNLOAD_WIDTH);
  if (typeof document === "undefined") {
    return { ok: false as const, error: "Download is only available in the browser." };
  }

  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = referralQrDownloadFilename(referralCode);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return { ok: true as const };
}
