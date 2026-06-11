"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";

const LeaderboardRiderPreviewSheet = dynamic(
  () =>
    import("@/components/growth/LeaderboardRiderPreviewSheet").then(
      (module) => module.LeaderboardRiderPreviewSheet,
    ),
  { ssr: false },
);
import {
  foundingLeaderboardDisplayName,
  foundingLeaderboardRowPoints,
  type FoundingLeaderboardData,
  type FoundingLeaderboardEntry,
} from "@/lib/growth/founding-leaderboard";
import { CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";

type Props = {
  data: FoundingLeaderboardData;
  loading?: boolean;
  error?: string | null;
};

function ScoringRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-white">+{value}</span>
    </div>
  );
}

function LeaderboardAvatar({
  avatarUrl,
  label,
}: {
  avatarUrl: string | null;
  label: string;
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={40}
        height={40}
        className={`h-10 w-10 rounded-full object-cover ${CS_AVATAR_RING}`}
      />
    );
  }

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full ${CS_AVATAR_FALLBACK} ${CS_AVATAR_RING} text-sm font-medium text-[#f1c3c7]`}
      aria-hidden
    >
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

export function FoundingLeaderboard({ data, loading = false, error = null }: Props) {
  const { entries, currentUser, topN, cutoffPoints, scoring } = data;
  const [previewEntry, setPreviewEntry] = useState<FoundingLeaderboardEntry | null>(null);

  const openPreview = (entry: FoundingLeaderboardEntry) => {
    setPreviewEntry(entry);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[22px] border border-[#b4141e]/25 bg-gradient-to-b from-[#1a0405]/70 to-black/40 p-5">
        <h1 className="font-serif text-3xl text-white">🏆 Blackcard Leaderboard</h1>
        <p className="mt-3 rounded-2xl border border-[#b4141e]/30 bg-[#b4141e]/10 px-4 py-3 text-sm font-medium text-[#f1c3c7]">
          Top {topN} Riders Earn Founding Blackcard
        </p>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Earn points by completing your profile, attending and hosting meets, and inviting riders
          who join and upgrade to Blackcard.
        </p>
        {cutoffPoints > 0 ? (
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-zinc-500">
            Top {topN} cutoff: {cutoffPoints} points
          </p>
        ) : null}
      </section>

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Your position</p>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading…</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className="text-3xl font-medium text-white">
              {currentUser.rank ? `#${currentUser.rank}` : "—"}
            </p>
            <p className="pb-1 text-sm text-zinc-400">{currentUser.points} points</p>
            {currentUser.inTop15 ? (
              <span className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]">
                In the race
              </span>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">How points are earned</p>
        <div className="mt-3 space-y-2">
          <ScoringRow label="Complete Profile" value={scoring.profileComplete} />
          <ScoringRow label="Attend Meet" value={scoring.attendMeet} />
          <ScoringRow label="Host Meet" value={scoring.hostMeet} />
          <ScoringRow label="Referral Signup" value={scoring.referralSignup} />
          <ScoringRow label="Referral → Blackcard" value={scoring.referralBlackcard} />
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-600">
          Posts, messages, reactions, and feed activity do not earn race points.
        </p>
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <section className="rounded-[22px] border border-white/10 bg-white/[0.02] p-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Leaderboard</p>

        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">Loading leaderboard…</p>
        ) : entries.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No riders on the board yet. Be the first.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.map((entry, index) => {
              const cutoffBeforeIndex = entries.findIndex((row) => row.rank > topN);
              const showCutoff = cutoffBeforeIndex === index && cutoffBeforeIndex > 0;
              const name = foundingLeaderboardDisplayName(entry);

              return (
                <li key={entry.userId}>
                  {showCutoff ? (
                    <div className="my-3 flex items-center gap-3">
                      <span className="h-px flex-1 bg-[#b4141e]/40" />
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">
                        Top {topN} cutoff
                      </span>
                      <span className="h-px flex-1 bg-[#b4141e]/40" />
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => openPreview(entry)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition hover:border-[#b4141e]/35 ${
                      entry.isCurrentUser
                        ? "border-[#b4141e]/50 bg-[#b4141e]/10"
                        : entry.inTop15
                          ? "border-[#b4141e]/20 bg-black/20"
                          : "border-white/8 bg-black/10"
                    }`}
                  >
                    <span className="w-8 shrink-0 text-center text-sm font-medium text-zinc-500">
                      #{entry.rank}
                    </span>
                    <LeaderboardAvatar avatarUrl={entry.avatarUrl} label={name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{name}</p>
                      {entry.username ? (
                        <p className="truncate text-xs text-zinc-500">@{entry.username}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-medium text-[#f1c3c7]">
                      {foundingLeaderboardRowPoints(entry)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {previewEntry ? (
        <LeaderboardRiderPreviewSheet entry={previewEntry} onClose={() => setPreviewEntry(null)} />
      ) : null}
    </div>
  );
}
