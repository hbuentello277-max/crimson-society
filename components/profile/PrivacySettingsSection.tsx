"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PrivacyToggle from "@/components/profile/PrivacyToggle";
import { fetchBlockState } from "@/lib/blocking";
import type { AppProfile } from "@/lib/profile";

type Props = {
  profile: AppProfile;
  userId: string;
  onUpdatePrivacy: (values: {
    hide_from_suggestions: boolean;
    hide_location_from_suggestions: boolean;
  }) => Promise<AppProfile>;
};

export default function PrivacySettingsSection({
  profile,
  userId,
  onUpdatePrivacy,
}: Props) {
  const [showInDiscovery, setShowInDiscovery] = useState(
    () => !(profile.hide_from_suggestions ?? false),
  );
  const [showLocationInDiscovery, setShowLocationInDiscovery] = useState(
    () => !(profile.hide_location_from_suggestions ?? false),
  );
  const [blockedCount, setBlockedCount] = useState(0);
  const [savingField, setSavingField] = useState<"discovery" | "location" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setShowInDiscovery(!(profile.hide_from_suggestions ?? false));
    setShowLocationInDiscovery(!(profile.hide_location_from_suggestions ?? false));
  }, [profile.hide_from_suggestions, profile.hide_location_from_suggestions]);

  const loadBlockedCount = useCallback(async () => {
    try {
      const state = await fetchBlockState(userId);
      setBlockedCount(state.blockedByMe.size);
    } catch {
      setBlockedCount(0);
    }
  }, [userId]);

  useEffect(() => {
    void loadBlockedCount();
  }, [loadBlockedCount]);

  async function saveDiscoveryToggle(enabled: boolean) {
    const previous = showInDiscovery;
    setShowInDiscovery(enabled);
    setSavingField("discovery");
    setMessage("");

    try {
      await onUpdatePrivacy({
        hide_from_suggestions: !enabled,
        hide_location_from_suggestions: profile.hide_location_from_suggestions ?? false,
      });
      setMessage("Discovery visibility updated.");
    } catch (error) {
      setShowInDiscovery(previous);
      setMessage(error instanceof Error ? error.message : "Could not save privacy setting.");
    } finally {
      setSavingField(null);
    }
  }

  async function saveLocationToggle(enabled: boolean) {
    const previous = showLocationInDiscovery;
    setShowLocationInDiscovery(enabled);
    setSavingField("location");
    setMessage("");

    try {
      await onUpdatePrivacy({
        hide_from_suggestions: profile.hide_from_suggestions ?? false,
        hide_location_from_suggestions: !enabled,
      });
      setMessage("Location visibility updated.");
    } catch (error) {
      setShowLocationInDiscovery(previous);
      setMessage(error instanceof Error ? error.message : "Could not save privacy setting.");
    } finally {
      setSavingField(null);
    }
  }

  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
      <div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">Privacy</p>
        <h2 className="mt-2 font-serif text-3xl text-white">Your visibility</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-500">
          Control how other members find you in Connect and what location details appear in suggestions.
        </p>
      </div>

      {message && (
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-400">{message}</p>
      )}

      <div className="mt-6 space-y-3">
        <PrivacyToggle
          label="Show Me in Discovery"
          description="Allow other members to find you in Connect."
          enabled={showInDiscovery}
          disabled={savingField !== null}
          onChange={(enabled) => void saveDiscoveryToggle(enabled)}
        />
        <PrivacyToggle
          label="Show Location in Discovery"
          description="Allow your city and riding area to appear in member suggestions."
          enabled={showLocationInDiscovery}
          disabled={savingField !== null || !showInDiscovery}
          onChange={(enabled) => void saveLocationToggle(enabled)}
        />
        {!showInDiscovery && (
          <p className="text-xs leading-6 text-zinc-600">
            When discovery is off, your profile is hidden from member suggestions. Location sharing in
            discovery has no effect until you turn discovery back on.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
        <p className="text-sm font-medium text-white">Live Location Sharing</p>
        <p className="mt-1 text-xs leading-6 text-zinc-500">
          Controlled from the Live Map screen.
        </p>
        <Link
          href="/rides/track"
          className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
        >
          Open Live Map
        </Link>
      </div>

      <Link
        href="/profile/privacy/blocked"
        className="mt-3 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4 transition hover:border-[#b4141e]/40"
      >
        <div>
          <p className="text-sm font-medium text-white">Blocked Members</p>
          <p className="mt-1 text-xs leading-6 text-zinc-500">
            Manage riders you have blocked.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
          {blockedCount} blocked
        </span>
      </Link>
    </section>
  );
}
