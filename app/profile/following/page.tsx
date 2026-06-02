"use client";

import Link from "next/link";
import FollowListView from "@/components/profile/FollowListView";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

export default function PrivateFollowingPage() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">Loading</p>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <div>
          <h1 className="font-serif text-3xl">Sign in required</h1>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#f1c3c7]"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <p className="text-sm text-zinc-400">Profile could not be loaded.</p>
      </main>
    );
  }

  return (
    <FollowListView
      kind="following"
      subjectProfileId={profile.id}
      subjectUsername={profile.username}
      backHref="/profile"
    />
  );
}
