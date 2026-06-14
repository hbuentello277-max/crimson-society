"use client";

import { useEffect, useState } from "react";
import { buildQrDataUrl, REFERRAL_QR_DISPLAY_WIDTH } from "@/lib/credits/referral-qr";

export function useQrCodeImage(targetUrl: string | null, failedLabel: string) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetUrl) {
      setQrDataUrl(null);
      setQrError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setQrError(null);

    void buildQrDataUrl(targetUrl, REFERRAL_QR_DISPLAY_WIDTH)
      .then((dataUrl) => {
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        setQrError(null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setQrDataUrl(null);
        setQrError(failedLabel);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [failedLabel, targetUrl]);

  return { qrDataUrl, qrError, loading };
}
