"use client";

import { useState } from "react";
import { openExternalUrl } from "@/lib/checkout/open-external-url";

export function BlackcardCheckoutButton({
  planType,
  label,
}: {
  planType: "apex_monthly" | "apex_yearly";
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    try {
      setLoading(true);

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planType }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Unable to start checkout.");
        return;
      }

      if (data.url) {
        await openExternalUrl(data.url);
      } else {
        alert("No checkout URL returned.");
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong starting checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="w-full rounded-full bg-red-600 px-6 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-black transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Redirecting..." : label}
    </button>
  );
}