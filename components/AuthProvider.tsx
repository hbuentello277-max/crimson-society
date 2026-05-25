"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(nextSession: Session) {
    const nextProfile = await ensureUserProfile(nextSession.user);
    setProfile(nextProfile);
    return nextProfile;
  }

  async function refreshProfile() {
    if (!session?.user) {
      setProfile(null);
      return null;
    }

    return loadProfile(session);
  }

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !data.session) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(data.session);
      await loadProfile(data.session);
      if (mounted) setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);

      if (nextSession?.user?.id) {
        await loadProfile(nextSession);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
