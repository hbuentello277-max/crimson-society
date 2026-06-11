"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import PrivacyToggle from "@/components/profile/PrivacyToggle";
import { fetchBlockState } from "@/lib/blocking";
import type { AppProfile } from "@/lib/profile";
import { hrefWithProfileMenuFrom } from "@/lib/navigation/profile-menu-return";

type Props = {
  profile: AppProfile;
  userId: string;
  onUpdatePrivacy: (values: {
    hide_from_suggestions: boolean;
    hide_location_from_suggestions: boolean;
  }) => Promise<AppProfile>;
};

export function ProfileVisibilityMenuSection({
  profile,
  userId,
  onUpdatePrivacy,
}: Props) {
  const [expanded, setExpanded] = useState(false);
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
      setMessage(error instanceof Error ? error.message : "Could not save visibility setting.");
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
      setMessage(error instanceof Error ? error.message : "Could not save visibility setting.");
    } finally {
      setSavingField(null);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-1 text-left transition hover:text-white"
        aria-expanded={expanded}
      >
        <span className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Visibility</span>
        <span className="text-sm text-zinc-400" aria-hidden>
          {expanded ? "⌄" : "›"}
        </span>
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-5 text-zinc-600">
            Control how other riders find you in Connect.
          </p>

          {message ? (
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{message}</p>
          ) : null}

          <div className="space-y-2">
            <PrivacyToggle
              label="Show Me in Discovery"
              description="Allow other members to find you in Connect."
              enabled={showInDiscovery}
              disabled={savingField !== null}
              onChange={(enabled) => void saveDiscoveryToggle(enabled)}
            />
            <PrivacyToggle
              label="Show Location in Discovery"
              description="Show city and riding area in member suggestions."
              enabled={showLocationInDiscovery}
              disabled={savingField !== null || !showInDiscovery}
              onChange={(enabled) => void saveLocationToggle(enabled)}
            />
          </div>

          <Link
            href={hrefWithProfileMenuFrom("/profile/privacy/blocked")}
            className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-xs text-zinc-300 transition hover:border-white/15 hover:text-white"
          >
            <span>Blocked Members</span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {blockedCount}
            </span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
