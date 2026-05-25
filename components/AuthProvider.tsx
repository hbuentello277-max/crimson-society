"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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

  const loadProfile = useCallback(async (nextSession: Session) => {
    const nextProfile = await ensureUserProfile(nextSession.user);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      return null;
    }

    return loadProfile(session);
  }, [loadProfile, session]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    let sawInitialSession = false;
    let requestId = 0;

    async function applySession(nextSession: Session | null) {
      const currentRequest = ++requestId;

      if (!mounted) return;

      if (!nextSession?.user?.id) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const nextProfile = await ensureUserProfile(nextSession.user);

      if (!mounted || currentRequest !== requestId) return;

      setSession(nextSession);
      setProfile(nextProfile);
      setLoading(false);
    }

    const fallbackTimer = window.setTimeout(async () => {
      if (!mounted || sawInitialSession) return;

      const { data } = await supabase.auth.getSession();
      await applySession(data.session ?? null);
    }, 750);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") {
        sawInitialSession = true;
      }

      void applySession(nextSession ?? null);
    });

    return () => {
      mounted = false;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void loadProfile(session);
      }
    };

    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => document.removeEventListener("visibilitychange", refreshOnFocus);
  }, [loadProfile, session]);

  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      if (!session?.user?.id) return;

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (error || !user) {
        setSession(null);
        setProfile(null);
      }
    }

    void validateSession();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const role = profile?.role ?? null;
  const status = profile?.status ?? null;
  const isAdmin = role === "admin" && status === "active";
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
