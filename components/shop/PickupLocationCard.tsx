"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LOCAL_PICKUP_SETTINGS,
  type LocalPickupSettings,
  pickupPreviewText,
  pickupReadyDetailsText,
} from "@/lib/shop/pickup-settings";

type Mode = "preview" | "ready";

type Props = {
  mode: Mode;
  pickupNote?: string | null;
  pickupStatus?: string | null;
  className?: string;
};

export function PickupLocationCard({
  mode,
  pickupNote,
  pickupStatus,
  className = "",
}: Props) {
  const [settings, setSettings] = useState<LocalPickupSettings>(DEFAULT_LOCAL_PICKUP_SETTINGS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/shop/pickup-settings", { cache: "no-store" });
        const data = (await res.json()) as { settings?: LocalPickupSettings };
        if (!cancelled && data.settings) {
          setSettings(data.settings);
        }
      } catch {
        // Defaults are fine.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isReady = mode === "ready" || pickupStatus === "ready" || pickupStatus === "picked_up";

  return (
    <div
      className={`rounded-2xl border border-[#b4141e]/25 bg-[#b4141e]/5 p-4 ${className}`}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">Local pickup</p>
      <p className="mt-2 font-serif text-lg italic text-white">{settings.name}</p>

      {isReady ? (
        <div className="mt-3 space-y-2 text-sm text-zinc-300">
          {settings.area ? (
            <p>
              <span className="text-zinc-500">Location: </span>
              {settings.area}
            </p>
          ) : null}
          {settings.instructions ? <p>{settings.instructions}</p> : null}
          {settings.hours ? (
            <p>
              <span className="text-zinc-500">Hours: </span>
              {settings.hours}
            </p>
          ) : null}
          {settings.contact_note ? (
            <p>
              <span className="text-zinc-500">Contact: </span>
              {settings.contact_note}
            </p>
          ) : null}
          {pickupNote?.trim() ? (
            <p className="rounded-xl border border-white/10 bg-black/30 p-3 text-zinc-200">
              {pickupNote.trim()}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-sm text-zinc-300">
          <p>{pickupPreviewText(settings)}</p>
          {settings.area ? (
            <p className="text-xs text-zinc-500">Pickup area: {settings.area}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function pickupReadyTextFromSettings(
  settings: LocalPickupSettings,
  pickupNote?: string | null,
) {
  return pickupReadyDetailsText(settings, pickupNote);
}
