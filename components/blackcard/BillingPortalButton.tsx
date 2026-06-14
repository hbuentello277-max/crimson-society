"use client";

import { useState } from "react";
import { useI18n } from "@/components/LanguageProvider";
import { openExternalUrl } from "@/lib/checkout/open-external-url";

type Props = {
  className?: string;
  label?: string;
};

export function BillingPortalButton({
  className = "rounded-full border border-white/15 px-6 py-3 text-xs uppercase tracking-[0.28em] text-zinc-200 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60",
  label,
}: Props) {
  const { dictionary } = useI18n();
  const copy = dictionary.blackcard;
  const [loading, setLoading] = useState(false);

  async function handleOpenPortal() {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || copy.billingUnavailable);
        return;
      }

      if (!data.url) {
        alert(copy.billingMissingUrl);
        return;
      }

      await openExternalUrl(data.url);
    } catch (error) {
      console.error(error);
      alert(copy.billingError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpenPortal}
      disabled={loading}
      className={className}
    >
      {loading ? copy.opening : label ?? copy.manageSubscription}
    </button>
  );
}
