import { BRANDED_APP_QR_EXPORT_WIDTH, buildBrandedAppQrPngBlob } from "@/lib/credits/app-qr-brand-image";

export type AppQrBrandCopy = {
  heading: string;
  slogan: string;
  targetUrl: string;
};

export async function downloadBrandedAppQrImage(input: {
  brand: AppQrBrandCopy;
  filename: string;
}) {
  if (typeof document === "undefined") {
    return { ok: false as const, error: "Download is only available in the browser." };
  }

  try {
    const blob = await buildBrandedAppQrPngBlob(input.brand, BRANDED_APP_QR_EXPORT_WIDTH);
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = input.filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Could not save app QR image." };
  }
}

export async function shareBrandedAppQrImage(input: {
  brand: AppQrBrandCopy;
  filename: string;
  shareTitle: string;
  shareText: string;
}) {
  if (typeof navigator === "undefined") {
    return { ok: false as const, error: "Share is only available in the browser." };
  }

  try {
    const blob = await buildBrandedAppQrPngBlob(input.brand, BRANDED_APP_QR_EXPORT_WIDTH);
    const file = new File([blob], input.filename, { type: "image/png" });

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
          url: input.brand.targetUrl,
        });
        return { ok: true as const, mode: "link" as const };
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return { ok: true as const, canceled: true as const };
        }
      }
    }

    return { ok: false as const, error: "Native share is unavailable on this device." };
  } catch {
    return { ok: false as const, error: "Could not share app QR image." };
  }
}
