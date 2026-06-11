"use client";

import { useCallback, useEffect, useState } from "react";
import type { CrimsonCreditsEconomySettings } from "@/lib/credits/economy-settings";

type Props = {
  onSaved?: () => void;
};

const NUMBER_FIELDS: {
  key: keyof CrimsonCreditsEconomySettings;
  label: string;
  hint?: string;
}[] = [
  { key: "attend_meet_credits", label: "Attend Meet credits" },
  { key: "host_meet_credits", label: "Host Meet credits" },
  { key: "referral_signup_credits", label: "Referral Signup credits" },
  { key: "referral_blackcard_credits", label: "Referral → Blackcard credits" },
  { key: "rider_onboarding_credits", label: "New rider onboarding credits" },
  { key: "monthly_earn_cap", label: "Monthly earn cap" },
  { key: "credits_per_100_usd", label: "Reward value (credits per $5)", hint: "100 credits = $5 → value 5" },
  { key: "blackcard_merch_discount_percent", label: "Blackcard merch discount (%)" },
];

const TOGGLE_FIELDS: { key: keyof CrimsonCreditsEconomySettings; label: string }[] = [
  { key: "earn_attend_meet_enabled", label: "Attend Meet earning" },
  { key: "earn_host_meet_enabled", label: "Host Meet earning" },
  { key: "earn_referral_signup_enabled", label: "Referral Signup earning" },
  { key: "earn_referral_blackcard_enabled", label: "Referral Blackcard earning" },
  { key: "earn_rider_onboarding_enabled", label: "New rider onboarding earning" },
];

export function EconomyTab({ onSaved }: Props) {
  const [settings, setSettings] = useState<CrimsonCreditsEconomySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/credits/economy");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load settings");
      }
      setSettings(data.settings);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/credits/economy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save settings");
      }
      setSettings(data.settings);
      setSuccess("Economy settings saved.");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function updateNumber(key: keyof CrimsonCreditsEconomySettings, raw: string) {
    if (!settings) return;
    const value = Number(raw);
    setSettings({ ...settings, [key]: Number.isFinite(value) ? value : 0 });
  }

  function updateToggle(key: keyof CrimsonCreditsEconomySettings, checked: boolean) {
    if (!settings) return;
    setSettings({ ...settings, [key]: checked });
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading economy settings…</p>;
  }

  if (!settings) {
    return <p className="text-sm text-red-300">{error ?? "Unable to load settings."}</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        Controls future earn awards only. Past ledger transactions are unchanged.
      </p>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {success && <p className="text-sm text-emerald-300">{success}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {NUMBER_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{field.label}</span>
            {field.hint ? <span className="mt-0.5 block text-[10px] text-zinc-600">{field.hint}</span> : null}
            <input
              type="number"
              min={0}
              value={settings[field.key] as number}
              onChange={(e) => updateNumber(field.key, e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </label>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Earning toggles</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {TOGGLE_FIELDS.map((field) => (
            <label key={field.key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5">
              <span className="text-sm text-zinc-300">{field.label}</span>
              <input
                type="checkbox"
                checked={settings[field.key] as boolean}
                onChange={(e) => updateToggle(field.key, e.target.checked)}
                className="h-4 w-4 accent-[#b4141e]"
              />
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-6 py-2.5 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:border-[#b4141e]/80 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save economy settings"}
      </button>
    </div>
  );
}
