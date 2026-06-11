"use client";

import { Suspense, useEffect, useState } from "react";
import { FoundingLeaderboard } from "@/components/growth/FoundingLeaderboard";
import { MeetsReturnBackButton } from "@/components/navigation/MeetsReturnBackButton";
import { useFoundingLeaderboard } from "@/hooks/useFoundingLeaderboard";
import { supabase } from "@/lib/supabase";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/crimson-accent";

function BlackcardLeaderboardPageContent() {
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
          <MeetsReturnBackButton />
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

export default function BlackcardLeaderboardPage() {
  return (
    <Suspense fallback={null}>
      <BlackcardLeaderboardPageContent />
    </Suspense>
  );
}
