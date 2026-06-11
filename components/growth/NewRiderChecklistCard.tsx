"use client";

import Link from "next/link";
import { shouldShowRiderChecklist, type RiderOnboardingStatus } from "@/lib/growth/rider-checklist";

type Props = {
  status: RiderOnboardingStatus;
  loading?: boolean;
  awarding?: boolean;
  compact?: boolean;
};

function ChecklistItem({
  done,
  label,
  href,
}: {
  done: boolean;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
        done
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-white/10 bg-black/20 hover:border-[#b4141e]/40"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${
          done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-zinc-500"
        }`}
        aria-hidden
      >
        {done ? "✓" : "☐"}
      </span>
      <span className={`text-sm ${done ? "text-emerald-100" : "text-zinc-200"}`}>{label}</span>
    </Link>
  );
}

export function NewRiderChecklistCard({
  status,
  loading = false,
  awarding = false,
  compact = false,
}: Props) {
  if (!loading && !shouldShowRiderChecklist(status)) {
    return null;
  }

  return (
    <section
      className={`rounded-[22px] border border-[#b4141e]/25 bg-gradient-to-b from-[#1a0405]/80 to-black/40 ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">New Rider</p>
          <h2 className="mt-1 font-serif text-xl text-white">Welcome to Crimson Society</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
          {loading ? "—" : `${status.progressPercent}%`}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#b4141e] transition-all duration-500"
          style={{ width: `${loading ? 0 : status.progressPercent}%` }}
        />
      </div>

      <div className="mt-4 space-y-2">
        <ChecklistItem
          done={status.profileComplete}
          label="Complete Your Profile"
          href="/profile/edit"
        />
        <ChecklistItem done={status.rideAdded} label="Add Your Ride" href="/profile/edit" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Reward</p>
        <p className="mt-1 text-sm text-[#f1c3c7]">+{status.rewardAmount} Crimson Credits</p>
      </div>

      {awarding ? (
        <p className="mt-3 text-xs text-zinc-500">Awarding your onboarding credits…</p>
      ) : null}

      {status.onboardingComplete && !status.creditsAwarded && !loading && !awarding ? (
        <p className="mt-3 text-xs text-zinc-500">Finishing credit award…</p>
      ) : null}
    </section>
  );
}
