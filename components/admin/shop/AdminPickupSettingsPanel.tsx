"use client";

import { useEffect, useState } from "react";
import type { LocalPickupSettings } from "@/lib/shop/pickup-settings";

export function AdminPickupSettingsPanel() {
  const [settings, setSettings] = useState<LocalPickupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/shop/pickup-settings");
        const data = (await res.json()) as { settings?: LocalPickupSettings; error?: string };
        if (!res.ok) {
          setError(data.error ?? "Failed to load pickup settings");
          return;
        }
        setSettings(data.settings ?? null);
      } catch {
        setError("Failed to load pickup settings");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/shop/pickup-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as { settings?: LocalPickupSettings; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setSettings(data.settings ?? settings);
      setSuccess("Pickup settings saved.");
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="mt-8 text-sm text-zinc-500">Loading pickup settings…</p>;
  }

  if (!settings) {
    return <p className="mt-8 text-sm text-red-300">{error ?? "Could not load settings."}</p>;
  }

  return (
    <div className="mt-8 max-w-2xl space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Shop settings</p>
        <h2 className="mt-2 font-serif text-2xl italic text-white">Local pickup location</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Public preview shows before payment and before orders are ready. Full details appear after
          pickup is marked ready.
        </p>
      </div>

      {success ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        {(
          [
            ["name", "Pickup name / title"],
            ["area", "Pickup area or address"],
            ["public_preview", "Public preview (before ready)"],
            ["instructions", "Pickup instructions"],
            ["hours", "Pickup hours"],
            ["contact_note", "Contact note"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">{label}</span>
            {key === "public_preview" || key === "instructions" || key === "contact_note" ? (
              <textarea
                rows={key === "public_preview" ? 2 : 3}
                value={settings[key]}
                disabled={saving}
                onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            ) : (
              <input
                value={settings[key]}
                disabled={saving}
                onChange={(e) => setSettings((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            )}
          </label>
        ))}

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save pickup settings"}
        </button>
      </div>
    </div>
  );
}
