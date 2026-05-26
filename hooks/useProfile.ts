"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchProfile,
  updateProfileAvatar,
  updateProfileIdentity,
  type AppProfile,
  type ProfileIdentityInput,
} from "@/lib/profile";

type UseProfileResult = {
  profile: AppProfile | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<AppProfile | null>;
  updateIdentity: (input: ProfileIdentityInput) => Promise<AppProfile>;
  updateAvatar: (profileImageUrl: string) => Promise<AppProfile>;
};

export function useProfile(): UseProfileResult {
  const { session, loading: authLoading, profile: authProfile, refreshProfile } = useAuth();
  const userId = session?.user?.id ?? null;
  const [profile, setProfile] = useState<AppProfile | null>(authProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setProfile(authProfile);
  }, [authProfile]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError("");

    try {
      const nextProfile = await fetchProfile(userId);
      setProfile(nextProfile);
      await refreshProfile();
      return nextProfile;
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : "Could not load profile.";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshProfile, userId]);

  useEffect(() => {
    if (authLoading) return;

    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [authLoading, refresh]);

  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const nextProfile = (event as CustomEvent<AppProfile>).detail;
      if (!nextProfile?.id || nextProfile.id !== userId) return;
      setProfile(nextProfile);
      setLoading(false);
    };

    window.addEventListener("crimson-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("crimson-profile-updated", onProfileUpdated);
  }, [userId]);

  const updateIdentity = useCallback(
    async (input: ProfileIdentityInput) => {
      if (!userId) throw new Error("You need to be logged in to update your profile.");

      const nextProfile = await updateProfileIdentity(userId, input);
      setProfile(nextProfile);
      window.dispatchEvent(
        new CustomEvent("crimson-profile-updated", { detail: nextProfile }),
      );
      await refreshProfile();
      return nextProfile;
    },
    [refreshProfile, userId],
  );

  const updateAvatar = useCallback(
    async (profileImageUrl: string) => {
      if (!userId) throw new Error("You need to be logged in to update your profile.");

      const nextProfile = await updateProfileAvatar(userId, profileImageUrl);
      setProfile(nextProfile);
      window.dispatchEvent(
        new CustomEvent("crimson-profile-updated", { detail: nextProfile }),
      );
      await refreshProfile();
      return nextProfile;
    },
    [refreshProfile, userId],
  );

  return { profile, loading: authLoading || loading, error, refresh, updateIdentity, updateAvatar };
}
