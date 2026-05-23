"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  role: string | null;
  status: string | null;
  display_name?: string | null;
  username?: string | null;
  profile_image_url?: string | null;
} | null;

type AuthContextType = {
  session: Session | null;
  loading: boolean;
  profile: Profile;
  role: string | null;
  status: string | null;
  isAdmin: boolean;
  isModerator: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  profile: null,
  role: null,
  status: null,
  isAdmin: false,
  isModerator: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, status, display_name, username, profile_image_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      setProfile(null);
      return;
    }

    setProfile((data as Profile) ?? null);
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
      await loadProfile(data.session.user.id);
      if (mounted) setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession ?? null);

      if (nextSession?.user?.id) {
        await loadProfile(nextSession.user.id);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}