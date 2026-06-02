"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export type FollowListKind = "followers" | "following";

type FollowProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  hide_location_from_suggestions: boolean | null;
};

type BlockPair = {
  blocker_id: string;
  blocked_id: string;
};

type Props = {
  kind: FollowListKind;
  subjectProfileId: string;
  subjectUsername?: string | null;
  backHref: string;
};

function displayName(profile: FollowProfile) {
  return profile.display_name?.trim() || profile.full_name?.trim() || "Crimson Member";
}

function handle(profile: FollowProfile) {
  const username = profile.username?.trim();
  return username ? `@${username}` : "@crimson-member";
}

function locationLabel(profile: FollowProfile) {
  if (profile.hide_location_from_suggestions) return null;

  const direct = profile.location?.trim();
  if (direct) return direct;

  const parts = [profile.city?.trim(), profile.state?.trim()].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function profilePath(username: string | null) {
  const clean = username?.trim().replace(/^@+/, "");
  return clean ? `/profile/${encodeURIComponent(clean)}` : null;
}

export default function FollowListView({
  kind,
  subjectProfileId,
  subjectUsername,
  backHref,
}: Props) {
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FollowProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [blockedByMe, setBlockedByMe] = useState<Set<string>>(new Set());
  const [blockingMe, setBlockingMe] = useState<Set<string>>(new Set());
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  const title = kind === "followers" ? "Followers" : "Following";
  const emptyMessage =
    kind === "followers" ? "No followers yet." : "Not following anyone yet.";

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);

    const relationColumn = kind === "followers" ? "following_id" : "follower_id";

    const { data: followRows, error: followError } = await supabase
      .from("user_follows")
      .select(kind === "followers" ? "follower_id, created_at" : "following_id, created_at")
      .eq(relationColumn, subjectProfileId)
      .order("created_at", { ascending: false });

    if (followError) {
      setError(followError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const userIds = (followRows ?? [])
      .map((row) => {
        if (kind === "followers" && "follower_id" in row) {
          return row.follower_id;
        }
        if (kind === "following" && "following_id" in row) {
          return row.following_id;
        }
        return null;
      })
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (userIds.length === 0) {
      setRows([]);
      setFollowingIds(new Set());
      setBlockedByMe(new Set());
      setBlockingMe(new Set());
      setLoading(false);
      return;
    }

    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, full_name, profile_image_url, avatar_url, location, city, state, hide_location_from_suggestions",
      )
      .in("id", userIds);

    if (profileError) {
      setError(profileError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const profileMap = new Map(
      ((profileRows ?? []) as FollowProfile[]).map((profile) => [profile.id, profile]),
    );
    const orderedProfiles = userIds
      .map((id) => profileMap.get(id))
      .filter((profile): profile is FollowProfile => Boolean(profile));

    if (!currentUserId) {
      setRows(orderedProfiles);
      setFollowingIds(new Set());
      setBlockedByMe(new Set());
      setBlockingMe(new Set());
      setLoading(false);
      return;
    }

    const otherIds = userIds.filter((id) => id !== currentUserId);

    const [followResponse, blockResponse] = await Promise.all([
      otherIds.length > 0
        ? supabase
            .from("user_follows")
            .select("following_id")
            .eq("follower_id", currentUserId)
            .in("following_id", otherIds)
        : Promise.resolve({ data: [], error: null }),
      otherIds.length > 0
        ? supabase
            .from("user_blocks")
            .select("blocker_id, blocked_id")
            .or(
              otherIds
                .flatMap((id) => [
                  `and(blocker_id.eq.${currentUserId},blocked_id.eq.${id})`,
                  `and(blocker_id.eq.${id},blocked_id.eq.${currentUserId})`,
                ])
                .join(","),
            )
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (followResponse.error || blockResponse.error) {
      setError(followResponse.error?.message || blockResponse.error?.message || null);
    }

    setFollowingIds(
      new Set(
        ((followResponse.data ?? []) as { following_id: string }[]).map(
          (row) => row.following_id,
        ),
      ),
    );

    const nextBlockedByMe = new Set<string>();
    const nextBlockingMe = new Set<string>();

    for (const row of (blockResponse.data ?? []) as BlockPair[]) {
      if (row.blocker_id === currentUserId) {
        nextBlockedByMe.add(row.blocked_id);
      }
      if (row.blocked_id === currentUserId) {
        nextBlockingMe.add(row.blocker_id);
      }
    }

    setBlockedByMe(nextBlockedByMe);
    setBlockingMe(nextBlockingMe);

    const blockedIds = new Set([...nextBlockedByMe, ...nextBlockingMe]);
    setRows(orderedProfiles.filter((profile) => !blockedIds.has(profile.id)));

    setLoading(false);
  }, [currentUserId, kind, subjectProfileId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const subtitle = useMemo(() => {
    if (subjectUsername?.trim()) {
      return `@${subjectUsername.trim().replace(/^@+/, "")}`;
    }
    return "Profile";
  }, [subjectUsername]);

  const toggleFollow = async (target: FollowProfile) => {
    if (!currentUserId || target.id === currentUserId || followBusyId) return;
    if (blockedByMe.has(target.id) || blockingMe.has(target.id)) return;

    setFollowBusyId(target.id);

    const isFollowing = followingIds.has(target.id);

    if (isFollowing) {
      const { error: unfollowError } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", target.id);

      if (unfollowError) {
        setError(unfollowError.message);
      } else {
        setFollowingIds((current) => {
          const next = new Set(current);
          next.delete(target.id);
          return next;
        });
      }
    } else {
      const { error: followError } = await supabase.from("user_follows").insert({
        follower_id: currentUserId,
        following_id: target.id,
      });

      if (followError && followError.code !== "23505") {
        setError(followError.message);
      } else {
        setFollowingIds((current) => new Set(current).add(target.id));
      }
    }

    setFollowBusyId(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.25),transparent_65%)]" />

      <div className="relative mx-auto max-w-2xl px-5 pb-24 pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top)+2rem)]">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-lg text-zinc-300 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
            aria-label="Go back"
          >
            ←
          </Link>
          <div className="min-w-0 pt-0.5">
            <p className="text-[10px] uppercase tracking-[0.34em] text-zinc-500">{subtitle}</p>
            <h1 className="font-serif text-3xl leading-none text-white">{title}</h1>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded-full bg-white/10" />
                    <div className="h-3 w-24 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center">
            <p className="font-serif text-xl italic text-zinc-300">{emptyMessage}</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {rows.map((person) => {
              const href = profilePath(person.username);
              const avatarUrl = person.profile_image_url || person.avatar_url;
              const location = locationLabel(person);
              const isSelf = person.id === currentUserId;
              const isBlocked = blockedByMe.has(person.id);
              const isBlockingMe = blockingMe.has(person.id);
              const isFollowing = followingIds.has(person.id);
              const showFollowButton = Boolean(currentUserId && !isSelf);

              const rowContent = (
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/40 bg-black">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={`${displayName(person)} avatar`}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized={avatarUrl.includes("supabase")}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.24),transparent_58%)] font-serif text-lg text-[#f0c8cb]">
                        {displayName(person).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{displayName(person)}</p>
                    <p className="truncate text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                      {handle(person)}
                    </p>
                    {location && (
                      <p className="mt-1 truncate text-xs text-zinc-500">{location}</p>
                    )}
                  </div>
                </div>
              );

              return (
                <li
                  key={person.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                >
                  <div className="flex items-center gap-3">
                    {href ? (
                      <Link href={href} className="min-w-0 flex-1 transition hover:opacity-90">
                        {rowContent}
                      </Link>
                    ) : (
                      <div className="min-w-0 flex-1">{rowContent}</div>
                    )}

                    {showFollowButton && (
                      <button
                        type="button"
                        onClick={() => void toggleFollow(person)}
                        disabled={
                          followBusyId === person.id || isBlocked || isBlockingMe
                        }
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isFollowing
                            ? "border-[#b4141e]/35 bg-[#b4141e]/12 text-[#e87a82]"
                            : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                        }`}
                      >
                        {followBusyId === person.id
                          ? "Saving"
                          : isBlocked || isBlockingMe
                            ? "Unavailable"
                            : isFollowing
                              ? "Following"
                              : "Follow"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
