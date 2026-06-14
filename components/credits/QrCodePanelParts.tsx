"use client";

import {
  REFERRAL_QR_DISPLAY_WIDTH,
} from "@/lib/credits/referral-qr";

type QrCodeImageFrameProps = {
  qrDataUrl: string | null;
  qrError: string | null;
  loading: boolean;
  loadingLabel: string;
  imageAlt: string;
};

export function QrCodeImageFrame({
  qrDataUrl,
  qrError,
  loading,
  loadingLabel,
  imageAlt,
}: QrCodeImageFrameProps) {
  return (
    <div className="mt-5 flex justify-center">
      <div className="rounded-[28px] border border-white/10 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt={imageAlt}
            width={REFERRAL_QR_DISPLAY_WIDTH}
            height={REFERRAL_QR_DISPLAY_WIDTH}
            className="h-auto w-full max-w-[320px]"
          />
        ) : (
          <div className="flex h-[280px] w-[280px] max-w-full items-center justify-center rounded-2xl bg-zinc-100 px-4 text-center text-sm text-zinc-500">
            {qrError ?? (loading ? loadingLabel : loadingLabel)}
          </div>
        )}
      </div>
    </div>
  );
}

type QrActionButtonsProps = {
  copyLabel: string;
  shareLabel: string;
  downloadLabel: string;
  onCopy: () => void;
  onShare: () => void;
  onDownload: () => void;
};

export function QrActionButtons({
  copyLabel,
  shareLabel,
  downloadLabel,
  onCopy,
  onShare,
  onDownload,
}: QrActionButtonsProps) {
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={onCopy}
        className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
      >
        {copyLabel}
      </button>
      <button
        type="button"
        onClick={onShare}
        className="rounded-full border border-white/15 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 hover:text-white"
      >
        {shareLabel}
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="rounded-full border border-white/15 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/30 hover:text-white"
      >
        {downloadLabel}
      </button>
    </div>
  );
}
