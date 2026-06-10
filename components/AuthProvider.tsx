"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { logAuthSessionEvent } from "@/lib/auth/session-log";
import { supabase } from "@/lib/supabase";
import { ensureUserProfile, type AppProfile } from "@/lib/profile";

type Profile = AppProfile | null;

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  profile: Profile;
  role: string | null;
  status: string | null;
  isAdmin: boolean;
  isModerator: boolean;
  refreshProfile: () => Promise<Profile>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  profile: null,
  role: null,
  status: null,
  isAdmin: false,
  isModerator: false,
  refreshProfile: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user?.id) {
      setSession(null);
      setProfile(null);
      setLoading(false);
      return null;
    }

    setSession(nextSession);

    const nextProfile = await ensureUserProfile(nextSession.user);
    setProfile(nextProfile);
    setLoading(false);
    return nextProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) {
      setProfile(null);
      return null;
    }

    const nextProfile = await ensureUserProfile(session.user);
    setProfile(nextProfile);
    return nextProfile;
  }, [session]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    async function safeApplySession(
      nextSession: Session | null,
      source: string,
    ) {
      const currentRequest = ++requestId;
      logAuthSessionEvent("apply-session-start", {
        source,
        hasSession: !!nextSession?.user?.id,
      });

      const nextProfile = await applySession(nextSession);

      if (!mounted || currentRequest !== requestId) return;
      if (nextProfile) setProfile(nextProfile);

      logAuthSessionEvent("apply-session-complete", {
        source,
        hasSession: !!nextSession?.user?.id,
        profileStatus: nextProfile?.status ?? null,
      });
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      void safeApplySession(data.session ?? null, "getSession-initial");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      logAuthSessionEvent("auth-state-change", {
        event,
        hasSession: !!nextSession?.user?.id,
      });
      void safeApplySession(nextSession ?? null, `onAuthStateChange:${event}`);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshProfile();
      }
    };

    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => document.removeEventListener("visibilitychange", refreshOnFocus);
  }, [refreshProfile, session?.user?.id]);

  const role = profile?.role ?? null;
  const status = profile?.status ?? null;
  const isAdmin = (profile?.is_admin === true || role === "admin") && status === "active";
  const isModerator =
    (role === "moderator" || role === "admin") && status === "active";

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        profile,
        role,
        status,
        isAdmin,
        isModerator,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
