"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { QrActionButtons, QrCodeImageFrame } from "@/components/credits/QrCodePanelParts";
import { useQrCodeImage } from "@/hooks/useQrCodeImage";
import { referralShareText } from "@/lib/credits/referral-link";
import { buildPublicReferralSignupUrl } from "@/lib/credits/referral-public-origin";
import { referralQrDownloadFilename } from "@/lib/credits/referral-qr-options";
import {
  copySignupLink,
  downloadQrImage,
  shareQrImage,
} from "@/lib/credits/referral-qr-share";

type Props = {
  referralCode: string | null;
  loading?: boolean;
};

export function ReferralQrPanel({ referralCode, loading = false }: Props) {
  const { dictionary } = useI18n();
  const copy = dictionary.credits;
  const [copyLinkLabel, setCopyLinkLabel] = useState(copy.copyReferralLink);
  const [shareLabel, setShareLabel] = useState(copy.shareQr);
  const [downloadLabel, setDownloadLabel] = useState(copy.downloadQr);

  const normalizedCode = referralCode?.trim() ?? "";
  const signupUrl = useMemo(() => {
    if (!normalizedCode) return null;
    return buildPublicReferralSignupUrl(normalizedCode);
  }, [normalizedCode]);

  const { qrDataUrl, qrError, loading: qrLoading } = useQrCodeImage(
    signupUrl,
    copy.qrGenerateFailed,
  );

  const handleCopyLink = useCallback(async () => {
    if (!signupUrl) return;

    const result = await copySignupLink(signupUrl);
    if (!result.ok) {
      setCopyLinkLabel(copy.copyReferralLinkFailed);
      window.setTimeout(() => setCopyLinkLabel(copy.copyReferralLink), 2200);
      return;
    }

    setCopyLinkLabel(copy.copiedReferralLink);
    window.setTimeout(() => setCopyLinkLabel(copy.copyReferralLink), 2200);
  }, [copy, signupUrl]);

  const handleShareQr = useCallback(async () => {
    if (!signupUrl || !normalizedCode) return;

    const result = await shareQrImage({
      targetUrl: signupUrl,
      filename: referralQrDownloadFilename(normalizedCode),
      shareTitle: copy.myQrCodeTitle,
      shareText: referralShareText(normalizedCode, signupUrl),
    });

    if (!result.ok) {
      setShareLabel(copy.shareQrFailed);
      window.setTimeout(() => setShareLabel(copy.shareQr), 2200);
      return;
    }

    if ("canceled" in result && result.canceled) return;

    setShareLabel(copy.sharedQr);
    window.setTimeout(() => setShareLabel(copy.shareQr), 2200);
  }, [copy, normalizedCode, signupUrl]);

  const handleDownloadQr = useCallback(async () => {
    if (!signupUrl || !normalizedCode) return;

    const result = await downloadQrImage({
      targetUrl: signupUrl,
      filename: referralQrDownloadFilename(normalizedCode),
    });
    if (!result.ok) {
      setDownloadLabel(copy.downloadQrFailed);
      window.setTimeout(() => setDownloadLabel(copy.downloadQr), 2200);
      return;
    }

    setDownloadLabel(copy.downloadedQr);
    window.setTimeout(() => setDownloadLabel(copy.downloadQr), 2200);
  }, [copy, normalizedCode, signupUrl]);

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{copy.myQrCodeTitle}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{copy.myQrCodeSubtitle}</p>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-500">{copy.qrLoading}</p>
      ) : normalizedCode && signupUrl ? (
        <>
          <QrCodeImageFrame
            qrDataUrl={qrDataUrl}
            qrError={qrError}
            loading={qrLoading}
            loadingLabel={copy.qrLoading}
            imageAlt={copy.qrImageAlt}
          />

          <p className="mt-5 text-center text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            {copy.yourReferralCode}
          </p>
          <p className="mt-2 text-center font-mono text-2xl tracking-[0.2em] text-white">
            {normalizedCode}
          </p>
          <p className="mt-3 break-all text-center text-xs leading-5 text-zinc-500">{signupUrl}</p>

          <QrActionButtons
            copyLabel={copyLinkLabel}
            shareLabel={shareLabel}
            downloadLabel={downloadLabel}
            onCopy={() => void handleCopyLink()}
            onShare={() => void handleShareQr()}
            onDownload={() => void handleDownloadQr()}
          />

          <p className="mt-4 text-center text-xs leading-5 text-zinc-500">{copy.qrPrintHint}</p>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-6 text-zinc-500">{copy.qrMissingCode}</p>
          <Link
            href="/profile/edit"
            className="mt-4 inline-flex rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/30 hover:text-white"
          >
            {copy.qrEditProfileCta}
          </Link>
        </>
      )}
    </section>
  );
}
