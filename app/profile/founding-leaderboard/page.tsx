"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FoundingLeaderboard } from "@/components/growth/FoundingLeaderboard";
import { useFoundingLeaderboard } from "@/hooks/useFoundingLeaderboard";
import { supabase } from "@/lib/supabase";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/crimson-accent";

export default function FoundingLeaderboardPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      setAuthLoading(false);
    }
    void loadUser();
  }, []);

  const { data, loading, error } = useFoundingLeaderboard(Boolean(userId));

  return (
    <main className={`min-h-screen bg-[#050505] text-white ${BOTTOM_NAV_CLEARANCE}`}>
      <div className="mx-auto max-w-2xl px-4 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6">
        <div className="mb-4">
          <Link
            href="/blackcard"
            className="text-xs uppercase tracking-[0.2em] text-zinc-500 transition hover:text-[#e87a82]"
          >
            ← Blackcard
          </Link>
        </div>

        <FoundingLeaderboard
          data={data}
          loading={authLoading || loading}
          error={error}
        />
      </div>
    </main>
  );
}
