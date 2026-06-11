"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import {
  normalizeReferralCodeInput,
  validateReferralCodeFormat,
} from "@/lib/credits/referral-code";
import { ensureOwnReferralCode, setOwnReferralCode } from "@/lib/credits/set-own-referral-code";

type Props = {
  profile: AppProfile;
  onCodeUpdated?: (code: string) => void;
};

export default function ReferralCodeSection({ profile, onCodeUpdated }: Props) {
  const [code, setCode] = useState(profile.referral_code ?? "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");

  useEffect(() => {
    setCode(profile.referral_code ?? "");
  }, [profile.referral_code]);

  const hasCode = Boolean(profile.referral_code?.trim());
  const referred = Boolean(profile.referred_by_user_id);

  const handleSave = useCallback(async () => {
    setMessage("");
    const normalized = normalizeReferralCodeInput(code);
    const formatError = validateReferralCodeFormat(normalized);
    if (formatError) {
      setMessage(formatError);
      return;
    }

    setSaving(true);
    const result = await setOwnReferralCode(supabase, normalized);
    setSaving(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setCode(result.referralCode);
    setMessage("Referral code saved.");
    onCodeUpdated?.(result.referralCode);
  }, [code, onCodeUpdated]);

  const handleGenerate = useCallback(async () => {
    setMessage("");
    setGenerating(true);
    const result = await ensureOwnReferralCode(supabase);
    setGenerating(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setCode(result.referralCode);
    setMessage("Referral code ready.");
    onCodeUpdated?.(result.referralCode);
  }, [onCodeUpdated]);

  const handleCopy = useCallback(async () => {
    const value = (code || profile.referral_code || "").trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyLabel("Copied");
      window.setTimeout(() => setCopyLabel("Copy"), 2000);
    } catch {
      setMessage("Could not copy to clipboard.");
    }
  }, [code, profile.referral_code]);

  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">Referrals</p>
          <h2 className="mt-2 font-serif text-3xl text-white">Your referral code</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            Share this code with new members so they can enter it during signup.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!hasCode && (
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating || saving}
              className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82] disabled:opacity-60"
            >
              {generating ? "Generating..." : "Generate code"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || generating || !code.trim()}
            className="rounded-full bg-[#b4141e]/80 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-[#b4141e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : hasCode ? "Save code" : "Create code"}
          </button>
        </div>
      </div>

      {referred && (
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
          You were referred by another member. Referrer cannot be changed.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
            Referral code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(normalizeReferralCodeInput(e.target.value));
              if (message) setMessage("");
            }}
            placeholder="E.G. RIDER42"
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm tracking-wider text-white outline-none placeholder:text-zinc-600 focus:border-[#b4141e]/60"
          />
          <p className="mt-2 text-xs text-zinc-500">
            3–20 characters: letters, numbers, and . _ -
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!code.trim() && !profile.referral_code?.trim()}
          className="rounded-full border border-white/10 px-5 py-3 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82] disabled:opacity-50"
        >
          {copyLabel}
        </button>
      </div>

      {message && (
        <p
          className={`mt-4 text-xs uppercase tracking-[0.2em] ${
            message.includes("saved") || message.includes("ready")
              ? "text-emerald-300/80"
              : "text-zinc-400"
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
