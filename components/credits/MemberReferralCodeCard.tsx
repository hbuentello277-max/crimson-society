"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildReferralSignupUrl,
  referralShareText,
} from "@/lib/credits/referral-link";
import { CREDIT_EARN_AMOUNTS } from "@/lib/credits/config";

type Props = {
  referralCode: string | null;
  loading?: boolean;
};

export function MemberReferralCodeCard({ referralCode, loading = false }: Props) {
  const [copyCodeLabel, setCopyCodeLabel] = useState("Copy code");
  const [copyLinkLabel, setCopyLinkLabel] = useState("Copy link");
  const [shareLabel, setShareLabel] = useState("Share invite");

  const signupUrl = useMemo(() => {
    if (!referralCode?.trim()) return null;
    return buildReferralSignupUrl(referralCode);
  }, [referralCode]);

  const handleCopyCode = useCallback(async () => {
    const value = referralCode?.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyCodeLabel("Copied");
      window.setTimeout(() => setCopyCodeLabel("Copy code"), 2000);
    } catch {
      setCopyCodeLabel("Copy failed");
    }
  }, [referralCode]);

  const handleCopyLink = useCallback(async () => {
    if (!signupUrl) return;

    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopyLinkLabel("Copied");
      window.setTimeout(() => setCopyLinkLabel("Copy link"), 2000);
    } catch {
      setCopyLinkLabel("Copy failed");
    }
  }, [signupUrl]);

  const handleShare = useCallback(async () => {
    const code = referralCode?.trim();
    if (!code || !signupUrl) return;

    const text = referralShareText(code, signupUrl);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Join Crimson Society",
          text,
          url: signupUrl,
        });
        return;
      }

      if (typeof navigator === "undefined" || !navigator.clipboard) {
        throw new Error("Clipboard is unavailable.");
      }

      await navigator.clipboard.writeText(text);
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share invite"), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareLabel("Share failed");
      window.setTimeout(() => setShareLabel("Share invite"), 2000);
    }
  }, [referralCode, signupUrl]);

  return (
    <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Invite Riders</p>
      <p className="mt-2 text-sm text-zinc-400">Earn Crimson Credits when referrals join and upgrade.</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Referral Signup</p>
          <p className="mt-1 text-sm text-[#f1c3c7]">+{CREDIT_EARN_AMOUNTS.referral_signup} credits</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Referral → Blackcard</p>
          <p className="mt-1 text-sm text-[#f1c3c7]">+{CREDIT_EARN_AMOUNTS.referral_blackcard} credits</p>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-zinc-500">Loading…</p>
      ) : referralCode ? (
        <>
          <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Your referral code</p>
          <p className="mt-2 font-mono text-2xl tracking-[0.2em] text-white">{referralCode}</p>
          {signupUrl ? (
            <p className="mt-3 break-all text-xs leading-5 text-zinc-500">{signupUrl}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
            >
              {copyCodeLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              {copyLinkLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/30 hover:text-white"
            >
              {shareLabel}
            </button>
          </div>
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
