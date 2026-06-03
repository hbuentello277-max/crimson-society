"use client";

import Image from "next/image";
import type { AppProfile } from "@/lib/profile";
import { CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";
import { profileDisplayName, profileHandle, profileLocation } from "@/lib/profile";

type Props = {
  profile: AppProfile;
};

export default function ProfileHeader({ profile }: Props) {
  const displayName = profileDisplayName(profile);
  const avatarUrl = profile.profile_image_url || profile.avatar_url;
  const quote = profile.quote?.trim();
  const bio = profile.bio?.trim();

  return (
    <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)]">
      <div className="relative px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,20,30,0.12),transparent_32%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`relative h-24 w-24 shrink-0 sm:h-28 sm:w-28 ${CS_AVATAR_RING}`}>
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`${displayName} profile picture`}
                  fill
                  sizes="112px"
                  priority
                  className="object-cover"
                  unoptimized={avatarUrl.includes("supabase")}
                />
              ) : (
                <div className={`${CS_AVATAR_FALLBACK} text-3xl`}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 pt-1">
              <h1 className="font-serif text-[32px] leading-none text-white sm:text-[42px]">
                {displayName}
              </h1>
              <p className="mt-2 break-words text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                {profileHandle(profile)} · {profileLocation(profile)}
              </p>
              {quote && (
                <p className="mt-3 max-w-xl font-serif text-lg italic leading-7 text-zinc-300">
                  “{quote}”
                </p>
              )}
              {bio && <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{bio}</p>}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
