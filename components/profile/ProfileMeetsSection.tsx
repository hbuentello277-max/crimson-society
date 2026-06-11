"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  formatProfileMeetDate,
  loadProfileAttendedMeets,
  loadProfileHostedMeets,
  type ProfileMeetRow,
} from "@/lib/profile/profile-meets";
type LoadState = "idle" | "loading" | "loaded" | "error";

type Props = {
  userId: string | null;
};

function MeetRow({ meet }: { meet: ProfileMeetRow }) {
  return (
    <Link
      href={`/meets/${meet.id}`}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5 transition hover:border-[#b4141e]/35 hover:bg-white/[0.04]"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
        {meet.cover ? (
          <Image
            src={meet.cover}
            alt={meet.name}
            fill
            sizes="56px"
            className="object-cover"
            unoptimized={meet.cover.includes("supabase")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.22),transparent_58%)] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
            Meet
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{meet.name}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{formatProfileMeetDate(meet.date)}</p>
      </div>
    </Link>
  );
}

function Section({
  title,
  meets,
  emptyMessage,
}: {
  title: string;
  meets: ProfileMeetRow[];
  emptyMessage: string;
}) {
  return (
    <section>
      <h3 className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">{title}</h3>
      {meets.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-5 text-center text-sm text-zinc-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {meets.map((meet) => (
            <MeetRow key={meet.id} meet={meet} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ProfileMeetsSection({ userId }: Props) {
  const [hosted, setHosted] = useState<ProfileMeetRow[]>([]);
  const [attended, setAttended] = useState<ProfileMeetRow[]>([]);
  const [state, setState] = useState<LoadState>("idle");

  const loadMeets = useCallback(async () => {
    if (!userId) return;
    setState("loading");

    const [hostedResult, attendedResult] = await Promise.all([
      loadProfileHostedMeets(userId),
      loadProfileAttendedMeets(userId),
    ]);

    if (hostedResult.error || attendedResult.error) {
      setState("error");
      return;
    }

    setHosted(hostedResult.data);
    setAttended(attendedResult.data);
    setState("loaded");
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void loadMeets();
  }, [loadMeets, userId]);

  if (state === "loading") {
    return <p className="text-sm text-zinc-500">Loading meets…</p>;
  }

  if (state === "error") {
    return <p className="text-sm text-zinc-500">Meets could not load.</p>;
  }

  if (state !== "loaded") return null;

  return (
    <div className="space-y-6">
      <Section title="Hosted Meets" meets={hosted} emptyMessage="No hosted meets yet." />
      <Section title="Attended Meets" meets={attended} emptyMessage="No attended meets yet." />
    </div>
  );
}
