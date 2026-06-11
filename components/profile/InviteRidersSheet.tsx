"use client";

import { useCallback, useState } from "react";
import {
  buildInviteRidersShareMessage,
  buildInviteRidersShareUrl,
  inviteRidersSiteUrl,
} from "@/lib/credits/invite-riders-share";
import { CREDIT_EARN_AMOUNTS } from "@/lib/credits/config";
import type { OwnReferralStats } from "@/lib/credits/types";

type Props = {
  open: boolean;
  stats: OwnReferralStats;
  loading?: boolean;
  onClose: () => void;
};

export function InviteRidersSheet({ open, stats, loading = false, onClose }: Props) {
  const [copyLabel, setCopyLabel] = useState("Copy Code");
  const [shareLabel, setShareLabel] = useState("Share");

  const referralCode = stats.referral_code?.trim() ?? "";
  const siteUrl = inviteRidersSiteUrl();
  const previewMessage = referralCode
    ? buildInviteRidersShareMessage(referralCode)
    : "Your referral code will appear here once ready.";

  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy Code"), 2000);
    } catch {
      setCopyLabel("Copy failed");
      window.setTimeout(() => setCopyLabel("Copy Code"), 2000);
    }
  }, [referralCode]);

  const handleShare = useCallback(async () => {
    if (!referralCode) return;

    const text = buildInviteRidersShareMessage(referralCode);
    const url = buildInviteRidersShareUrl(referralCode);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Join Crimson Society",
          text,
          url,
        });
        return;
      }

      if (!navigator.clipboard) {
        throw new Error("Clipboard is unavailable.");
      }

      await navigator.clipboard.writeText(text);
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share"), 2000);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareLabel("Share failed");
      window.setTimeout(() => setShareLabel("Share"), 2000);
    }
  }, [referralCode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/65 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close invite riders sheet"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#080809] shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Invite Riders</p>
            <h2 className="mt-0.5 font-serif text-xl text-white">Earn Crimson Credits</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg text-zinc-300 transition hover:border-white/25 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="max-h-[78dvh] overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Signup</p>
              <p className="mt-1 text-sm text-[#f1c3c7]">
                Earn {CREDIT_EARN_AMOUNTS.referral_signup} Credits per signup
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Blackcard</p>
              <p className="mt-1 text-sm text-[#f1c3c7]">
                Earn {CREDIT_EARN_AMOUNTS.referral_blackcard} Credits when they join Blackcard
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Your Referral Code</p>
            {loading ? (
              <p className="mt-3 text-sm text-zinc-500">Loading…</p>
            ) : referralCode ? (
              <>
                <p className="mt-3 font-mono text-2xl tracking-[0.2em] text-white">{referralCode}</p>
                <button
                  type="button"
                  onClick={() => void handleCopyCode()}
                  className="mt-4 rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70"
                >
                  {copyLabel}
                </button>
              </>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                Set a referral code in Edit Profile to start inviting riders.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Preview</p>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-300">
              {previewMessage}
            </pre>
            <p className="mt-3 break-all text-xs text-zinc-500">{siteUrl}</p>
            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={!referralCode}
              className="mt-4 rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
            >
              {shareLabel}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Total referred</p>
              <p className="mt-1 text-lg font-medium text-white">{loading ? "—" : stats.total_referred}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">Credits earned</p>
              <p className="mt-1 text-lg font-medium text-white">
                {loading ? "—" : stats.total_referral_credits_earned}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
