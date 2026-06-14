"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { AppQrBrandedFrame } from "@/components/credits/AppQrBrandedFrame";
import { defaultAppQrBrandCopy } from "@/lib/credits/app-qr-brand-image";
import {
  downloadBrandedAppQrImage,
  shareBrandedAppQrImage,
} from "@/lib/credits/app-qr-brand-share";
import { PUBLIC_APP_SIGNUP_URL } from "@/lib/credits/referral-public-origin";
import { appQrDownloadFilename } from "@/lib/credits/referral-qr-options";
import { copySignupLink } from "@/lib/credits/referral-qr-share";

export function AppQrPanel() {
  const { dictionary } = useI18n();
  const copy = dictionary.credits;
  const [copyLinkLabel, setCopyLinkLabel] = useState(copy.copyAppLink);
  const [shareLabel, setShareLabel] = useState(copy.shareAppQr);
  const [downloadLabel, setDownloadLabel] = useState(copy.downloadAppQr);

  const brand = useMemo(
    () =>
      defaultAppQrBrandCopy({
        heading: copy.appQrHeading,
        slogan: copy.appQrSlogan,
      }),
    [copy.appQrHeading, copy.appQrSlogan],
  );

  const handleCopyLink = useCallback(async () => {
    const result = await copySignupLink(PUBLIC_APP_SIGNUP_URL);
    if (!result.ok) {
      setCopyLinkLabel(copy.copyAppLinkFailed);
      window.setTimeout(() => setCopyLinkLabel(copy.copyAppLink), 2200);
      return;
    }

    setCopyLinkLabel(copy.copiedAppLink);
    window.setTimeout(() => setCopyLinkLabel(copy.copyAppLink), 2200);
  }, [copy]);

  const handleShareQr = useCallback(async () => {
    const result = await shareBrandedAppQrImage({
      brand,
      filename: appQrDownloadFilename(),
      shareTitle: copy.appQrTitle,
      shareText: copy.appQrShareText,
    });

    if (!result.ok) {
      setShareLabel(copy.shareAppQrFailed);
      window.setTimeout(() => setShareLabel(copy.shareAppQr), 2200);
      return;
    }

    if ("canceled" in result && result.canceled) return;

    setShareLabel(copy.sharedAppQr);
    window.setTimeout(() => setShareLabel(copy.shareAppQr), 2200);
  }, [brand, copy]);

  const handleDownloadQr = useCallback(async () => {
    const result = await downloadBrandedAppQrImage({
      brand,
      filename: appQrDownloadFilename(),
    });
    if (!result.ok) {
      setDownloadLabel(copy.downloadAppQrFailed);
      window.setTimeout(() => setDownloadLabel(copy.downloadAppQr), 2200);
      return;
    }

    setDownloadLabel(copy.downloadedAppQr);
    window.setTimeout(() => setDownloadLabel(copy.downloadAppQr), 2200);
  }, [brand, copy]);

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{copy.appQrTitle}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{copy.appQrDescription}</p>

      <AppQrBrandedFrame
        copy={{
          heading: brand.heading,
          slogan: brand.slogan,
          targetUrl: brand.targetUrl,
          loadingLabel: copy.qrLoading,
          failedLabel: copy.qrGenerateFailed,
          imageAlt: copy.appQrImageAlt,
        }}
        copyLinkLabel={copyLinkLabel}
        shareLabel={shareLabel}
        downloadLabel={downloadLabel}
        onCopy={() => void handleCopyLink()}
        onShare={() => void handleShareQr()}
        onDownload={() => void handleDownloadQr()}
      />

      <p className="mt-4 text-center text-xs leading-5 text-zinc-500">{copy.appQrPrintHint}</p>
    </section>
  );
}
