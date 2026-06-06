"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import FollowListView from "@/components/profile/FollowListView";
import { supabase } from "@/lib/supabase";

export default function PublicFollowingPage() {
  const params = useParams<{ username: string }>();
  const usernameParam = Array.isArray(params?.username) ? params.username[0] : params?.username;
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!usernameParam) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("public_profiles")
        .select("id")
        .eq("username", usernameParam)
        .maybeSingle();

      if (!active) return;

      if (error || !data?.id) {
        setNotFound(true);
        setProfileId(null);
      } else {
        setProfileId(data.id);
      }

      setLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [usernameParam]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Loading</p>
      </main>
    );
  }

  if (notFound || !profileId || !usernameParam) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <div>
          <h1 className="font-serif text-3xl">Profile not found</h1>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300"
          >
            Back to Feed
          </Link>
        </div>
      </main>
    );
  }

  return (
    <FollowListView
      kind="following"
      subjectProfileId={profileId}
      subjectUsername={usernameParam}
      backHref={`/profile/${encodeURIComponent(usernameParam)}`}
    />
  );
}
