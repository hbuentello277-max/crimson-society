"use client";

import { useState } from "react";

type Props = {
  className?: string;
  label?: string;
};

export function BillingPortalButton({
  className = "rounded-full border border-white/15 px-6 py-3 text-xs uppercase tracking-[0.28em] text-zinc-200 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-60",
  label = "Manage Subscription",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleOpenPortal() {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to open billing portal.");
        return;
      }

      if (!data.url) {
        alert("Billing portal URL was not returned.");
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      alert("Something went wrong opening billing management.");
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
      {loading ? "Opening..." : label}
    </button>
  );
}
