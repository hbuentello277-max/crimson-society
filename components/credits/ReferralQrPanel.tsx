"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { buildPublicReferralSignupUrl } from "@/lib/credits/referral-public-origin";
import {
  buildReferralQrDataUrl,
  REFERRAL_QR_DISPLAY_WIDTH,
} from "@/lib/credits/referral-qr";
import {
  copyReferralSignupLink,
  downloadReferralQrImage,
  shareReferralQrImage,
} from "@/lib/credits/referral-qr-share";

type Props = {
  referralCode: string | null;
  loading?: boolean;
};

export function ReferralQrPanel({ referralCode, loading = false }: Props) {
  const { dictionary } = useI18n();
  const copy = dictionary.credits;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copyLinkLabel, setCopyLinkLabel] = useState(copy.copyReferralLink);
  const [shareLabel, setShareLabel] = useState(copy.shareQr);
  const [downloadLabel, setDownloadLabel] = useState(copy.downloadQr);

  const normalizedCode = referralCode?.trim() ?? "";
  const signupUrl = useMemo(() => {
    if (!normalizedCode) return null;
    return buildPublicReferralSignupUrl(normalizedCode);
  }, [normalizedCode]);

  useEffect(() => {
    if (!signupUrl) {
      setQrDataUrl(null);
      setQrError(null);
      return;
    }

    let cancelled = false;

    void buildReferralQrDataUrl(signupUrl, REFERRAL_QR_DISPLAY_WIDTH)
      .then((dataUrl) => {
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        setQrError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setQrDataUrl(null);
        setQrError(copy.qrGenerateFailed);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.qrGenerateFailed, signupUrl]);

  const handleCopyLink = useCallback(async () => {
    if (!signupUrl) return;

    const result = await copyReferralSignupLink(signupUrl);
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

    const result = await shareReferralQrImage({
      signupUrl,
      referralCode: normalizedCode,
      shareTitle: copy.myQrCodeTitle,
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

    const result = await downloadReferralQrImage(signupUrl, normalizedCode);
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
          <div className="mt-5 flex justify-center">
            <div className="rounded-[28px] border border-white/10 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={copy.qrImageAlt}
                  width={REFERRAL_QR_DISPLAY_WIDTH}
                  height={REFERRAL_QR_DISPLAY_WIDTH}
                  className="h-auto w-full max-w-[320px]"
                />
              ) : (
                <div className="flex h-[280px] w-[280px] max-w-full items-center justify-center rounded-2xl bg-zinc-100 text-sm text-zinc-500">
                  {qrError ?? copy.qrLoading}
                </div>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            {copy.yourReferralCode}
          </p>
          <p className="mt-2 text-center font-mono text-2xl tracking-[0.2em] text-white">
            {normalizedCode}
          </p>
          <p className="mt-3 break-all text-center text-xs leading-5 text-zinc-500">{signupUrl}</p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
            >
              {copyLinkLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleShareQr()}
              className="rounded-full border border-white/15 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              {shareLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadQr()}
              className="rounded-full border border-white/15 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              {downloadLabel}
            </button>
          </div>

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
