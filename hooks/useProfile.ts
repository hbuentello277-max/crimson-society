"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { MEMBERSHIP_UPDATED_EVENT } from "@/lib/membership-events";
import {
  fetchProfile,
  updateProfileAvatar,
  updateProfileIdentity,
  updateProfilePrivacy,
  type AppProfile,
  type ProfileIdentityInput,
  type ProfilePrivacyInput,
} from "@/lib/profile";

type UseProfileResult = {
  profile: AppProfile | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<AppProfile | null>;
  updateIdentity: (input: ProfileIdentityInput) => Promise<AppProfile>;
  updatePrivacy: (input: ProfilePrivacyInput) => Promise<AppProfile>;
  updateAvatar: (profileImageUrl: string) => Promise<AppProfile>;
};

export function useProfile(): UseProfileResult {
  const { session, loading: authLoading, profile: authProfile, refreshProfile } = useAuth();
  const userId = session?.user?.id ?? null;
  const [profile, setProfile] = useState<AppProfile | null>(authProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setProfile(authProfile), 0);
    return () => window.clearTimeout(timer);
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

    const onMembershipUpdated = () => {
      void refresh();
    };

    window.addEventListener("crimson-profile-updated", onProfileUpdated);
    window.addEventListener(MEMBERSHIP_UPDATED_EVENT, onMembershipUpdated);
    return () => {
      window.removeEventListener("crimson-profile-updated", onProfileUpdated);
      window.removeEventListener(MEMBERSHIP_UPDATED_EVENT, onMembershipUpdated);
    };
  }, [refresh, userId]);

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

  const updatePrivacy = useCallback(
    async (input: ProfilePrivacyInput) => {
      if (!userId) throw new Error("You need to be logged in to update your profile.");

      const nextProfile = await updateProfilePrivacy(userId, input);
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

  return {
    profile,
    loading: authLoading || loading,
    error,
    refresh,
    updateIdentity,
    updatePrivacy,
    updateAvatar,
  };
}
