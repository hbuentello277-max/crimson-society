"use client";

import { QrActionButtons } from "@/components/credits/QrCodePanelParts";
import { useQrCodeImage } from "@/hooks/useQrCodeImage";
import { REFERRAL_QR_DISPLAY_WIDTH } from "@/lib/credits/referral-qr";

type BrandedCopy = {
  heading: string;
  slogan: string;
  targetUrl: string;
  loadingLabel: string;
  failedLabel: string;
  imageAlt: string;
};

type Props = {
  copy: BrandedCopy;
  copyLinkLabel: string;
  shareLabel: string;
  downloadLabel: string;
  onCopy: () => void;
  onShare: () => void;
  onDownload: () => void;
};

export function AppQrBrandedFrame({
  copy,
  copyLinkLabel,
  shareLabel,
  downloadLabel,
  onCopy,
  onShare,
  onDownload,
}: Props) {
  const { qrDataUrl, qrError, loading } = useQrCodeImage(copy.targetUrl, copy.failedLabel);

  return (
    <>
      <div className="mt-5 flex justify-center">
        <div className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-white px-5 py-6 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          <p className="font-serif text-2xl leading-tight text-[#120608] sm:text-[1.65rem]">
            {copy.heading}
          </p>
          <p className="mt-2 font-serif text-sm leading-6 text-zinc-600 sm:text-base">
            {copy.slogan}
          </p>

          <div className="mx-auto mt-5 flex max-w-[320px] justify-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={copy.imageAlt}
                width={REFERRAL_QR_DISPLAY_WIDTH}
                height={REFERRAL_QR_DISPLAY_WIDTH}
                className="h-auto w-full"
              />
            ) : (
              <div className="flex h-[280px] w-[280px] max-w-full items-center justify-center rounded-2xl bg-zinc-100 px-4 text-sm text-zinc-500">
                {qrError ?? (loading ? copy.loadingLabel : copy.loadingLabel)}
              </div>
            )}
          </div>

          <p className="mt-5 break-all text-xs leading-5 text-zinc-600">{copy.targetUrl}</p>
        </div>
      </div>

      <QrActionButtons
        copyLabel={copyLinkLabel}
        shareLabel={shareLabel}
        downloadLabel={downloadLabel}
        onCopy={onCopy}
        onShare={onShare}
        onDownload={onDownload}
      />
    </>
  );
}
