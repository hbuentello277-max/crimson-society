"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

type Props = {
  referralCode: string | null;
  loading?: boolean;
};

export function MemberReferralCodeCard({ referralCode, loading = false }: Props) {
  const [copyLabel, setCopyLabel] = useState("Copy code");

  const handleCopy = useCallback(async () => {
    const value = referralCode?.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy code"), 2000);
    } catch {
      setCopyLabel("Copy failed");
    }
  }, [referralCode]);

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Your referral code</p>

      {loading ? (
        <p className="mt-3 text-sm text-zinc-500">Loading…</p>
      ) : referralCode ? (
        <>
          <p className="mt-3 font-mono text-2xl tracking-[0.2em] text-white">{referralCode}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Share this code with new members so they can enter it during signup.
          </p>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="mt-4 rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
          >
            {copyLabel}
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            You do not have a referral code yet. Create one on Edit Profile.
          </p>
          <Link
            href="/profile/edit"
            className="mt-4 inline-flex rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/30 hover:text-white"
          >
            Edit Profile
          </Link>
        </>
      )}
    </section>
  );
}
