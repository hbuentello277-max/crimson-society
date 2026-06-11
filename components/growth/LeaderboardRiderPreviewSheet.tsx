"use client";

import Image from "next/image";
import Link from "next/link";
import type { FoundingLeaderboardEntry } from "@/lib/growth/founding-leaderboard";
import { foundingLeaderboardDisplayName } from "@/lib/growth/founding-leaderboard";
import { CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";

type Props = {
  entry: FoundingLeaderboardEntry | null;
  onClose: () => void;
};

export function LeaderboardRiderPreviewSheet({ entry, onClose }: Props) {
  if (!entry) return null;

  const name = foundingLeaderboardDisplayName(entry);
  const profileHref = entry.username?.trim() ? `/profile/${entry.username.trim()}` : null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close rider preview"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-[91] w-full max-w-lg px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#09090b]/95 shadow-[0_30px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          <div className="px-6 pb-6 pt-8 text-center">
            <div className="mx-auto relative h-24 w-24">
              {entry.avatarUrl ? (
                <Image
                  src={entry.avatarUrl}
                  alt=""
                  width={96}
                  height={96}
                  className={`h-24 w-24 rounded-full object-cover ${CS_AVATAR_RING}`}
                />
              ) : (
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-full ${CS_AVATAR_FALLBACK} ${CS_AVATAR_RING} text-3xl font-medium text-[#f1c3c7]`}
                  aria-hidden
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <h2 className="mt-5 font-serif text-3xl text-white">{name}</h2>
            {entry.username ? (
              <p className="mt-1 text-sm text-zinc-500">@{entry.username}</p>
            ) : null}

            <p className="mt-5 text-sm text-zinc-400">
              Rank <span className="font-medium text-white">#{entry.rank}</span>
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              <span className="font-medium text-white">{entry.creditsBalance}</span> Crimson Credits
            </p>

            {profileHref ? (
              <Link
                href={profileHref}
                onClick={onClose}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-3.5 text-sm uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/20"
              >
                View Profile
              </Link>
            ) : (
              <p className="mt-6 text-xs text-zinc-600">Public profile unavailable.</p>
            )}
          </div>

          <div className="border-t border-white/8 p-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl px-4 py-4 text-center text-sm uppercase tracking-[0.18em] text-zinc-400 transition hover:bg-white/[0.04]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
