"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { getBestImageUrl } from "@/lib/media";
import { hasBlackcardAccess, type MembershipRow } from "@/lib/membership";

type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  full_name: string | null;
  bio: string | null;
  quote: string | null;
  profile_image_url: string | null;
  avatar_url: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  riding_area: string | null;
  bike_type: string | null;
  riding_style: string | null;
  profile_tags: string[] | null;
  status: string | null;
  membership_status: string | null;
  hide_location_from_suggestions: boolean | null;
  hide_from_suggestions: boolean | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
};

type ProfilePost = {
  id: string;
  post_type: "photo" | "reel" | "status" | null;
  caption: string | null;
  status_text?: string | null;
  status_bg?: string | null;
  image_url: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
};

type Motorcycle = {
  id: string;
  label: string | null;
  name: string | null;
  year: string | null;
  finish: string | null;
  photo_url: string | null;
  photo_path: string | null;
};

type ProfileRide = {
  id: string;
  name: string;
  date: string;
  time: string;
  meet_point: string;
  destination: string;
  privacy: string | null;
  distance: string | null;
  duration: string | null;
  cover: string | null;
  tracking_status: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type LoadState = "idle" | "loading" | "loaded" | "error";

const statusBgMap: Record<string, string> = {
  noir: "bg-gradient-to-br from-[#050505] via-[#0c0c0d] to-[#050505]",
  crimson: "bg-gradient-to-br from-[#3a0709] via-[#b4141e] to-[#3a0709]",
  carbon: "bg-gradient-to-br from-[#1a1a1c] via-[#2a2a2e] to-[#0a0a0c]",
  ember: "bg-gradient-to-br from-[#1a0405] via-[#6a0d14] to-[#0a0102]",
};

function profileDisplayName(profile: PublicProfile | null) {
  return profile?.display_name?.trim() || profile?.full_name?.trim() || "Crimson Member";
}

function profileHandle(profile: PublicProfile | null) {
  return profile?.username?.trim() ? `@${profile.username.trim().replace(/^@+/, "")}` : "@member";
}

function profileLocation(profile: PublicProfile | null) {
  if (profile?.hide_location_from_suggestions) return "Region private";

  return (
    profile?.location?.trim() ||
    [profile?.city, profile?.state].filter(Boolean).join(", ") ||
    profile?.riding_area?.trim() ||
    "Location pending"
  );
}

function normalizeSocialUrl(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function bikeInitial(bike: Motorcycle) {
  return (bike.name?.trim() || bike.label?.trim() || "G").charAt(0).toUpperCase();
}

function formatRideTime(time: string) {
  if (!time || time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) return time;
  if (!time.includes(":")) return time;

  const [hours, minutes] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-8 text-center shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)]">
      <div className="mx-auto flex items-center justify-center gap-4">
        <span className="h-px w-10 bg-white/15" />
        <span className="text-[#b4141e]">✦</span>
        <span className="h-px w-10 bg-white/15" />
      </div>
      <p className="mt-5 font-serif text-2xl italic text-zinc-300">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">{body}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-28 rounded-full bg-white/10" />
      <div className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex gap-4">
          <div className="h-24 w-24 rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-8 w-44 rounded-full bg-white/10" />
            <div className="h-3 w-32 rounded-full bg-white/10" />
            <div className="h-4 w-full max-w-sm rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const usernameParam = Array.isArray(params?.username) ? params.username[0] : params?.username;
  const { session } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [rides, setRides] = useState<ProfileRide[]>([]);
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [profileState, setProfileState] = useState<LoadState>("idle");
  const [postsState, setPostsState] = useState<LoadState>("idle");
  const [garageState, setGarageState] = useState<LoadState>("idle");
  const [ridesState, setRidesState] = useState<LoadState>("idle");
  const [tab, setTab] = useState<"posts" | "garage" | "rides">("posts");
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockingMe, setIsBlockingMe] = useState(false);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Harassment or abuse");
  const [reportDetails, setReportDetails] = useState("");
  const [safetyMessage, setSafetyMessage] = useState<string | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!usernameParam) return;

    const loadProfile = async () => {
      setProfileState("loading");

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, full_name, bio, quote, profile_image_url, avatar_url, location, city, state, riding_area, bike_type, riding_style, profile_tags, status, membership_status, hide_location_from_suggestions, hide_from_suggestions, instagram_url, tiktok_url, youtube_url, website_url",
        )
        .eq("username", usernameParam)
        .maybeSingle();

      if (error || !data) {
        setProfileState("error");
        return;
      }

      const nextProfile = data as PublicProfile;
      setProfile(nextProfile);
      setProfileState("loaded");

      const { data: membershipData } = await supabase
        .from("subscriptions")
        .select("status, plan_type, current_period_end, created_at")
        .eq("user_id", nextProfile.id)
        .in("status", ["active", "trialing"])
        .or(`current_period_end.is.null,current_period_end.gte.${new Date().toISOString()}`)
        .order("current_period_end", { ascending: false, nullsFirst: true })
        .limit(1)
        .maybeSingle();

      setMembership((membershipData as MembershipRow | null) ?? null);
    };

    void loadProfile();
  }, [usernameParam]);

  useEffect(() => {
    if (!profile?.id || tab !== "posts") return;

    const loadPosts = async () => {
      setPostsState("loading");

      const { data, error } = await supabase
        .from("Posts")
        .select(`
          id,
          post_type,
          caption,
          status_text,
          status_bg,
          image_url,
          image_display_url,
          image_thumbnail_url
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        setPostsState("error");
        return;
      }

      setPosts((data as ProfilePost[]) ?? []);
      setPostsState("loaded");
    };

    void loadPosts();
  }, [profile?.id, tab]);

  useEffect(() => {
    if (!profile?.id || tab !== "garage") return;

    const loadGarage = async () => {
      setGarageState("loading");

      const { data, error } = await supabase
        .from("motorcycles")
        .select("id, label, name, year, finish, photo_url, photo_path")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: true });

      if (error) {
        setGarageState("error");
        return;
      }

      setMotorcycles((data as Motorcycle[]) ?? []);
      setGarageState("loaded");
    };

    void loadGarage();
  }, [profile?.id, tab]);

  useEffect(() => {
    if (!profile?.id || tab !== "rides") return;

    const loadRides = async () => {
      setRidesState("loading");

      const { data, error } = await supabase
        .from("rides")
        .select(
          "id, name, date, time, meet_point, destination, privacy, distance, duration, cover, tracking_status, started_at, ended_at",
        )
        .eq("host_id", profile.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(24);

      if (error) {
        setRidesState("error");
        return;
      }

      setRides((data as ProfileRide[]) ?? []);
      setRidesState("loaded");
    };

    void loadRides();
  }, [profile?.id, tab]);

  useEffect(() => {
    if (!session?.user?.id || !profile?.id || session.user.id === profile.id) {
      setIsBlocked(false);
      setIsBlockingMe(false);
      return;
    }

    let active = true;

    const loadBlockState = async () => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${session.user.id},blocked_id.eq.${profile.id}),and(blocker_id.eq.${profile.id},blocked_id.eq.${session.user.id})`,
        );

      if (error || !active) return;

      const rows = (data || []) as { blocker_id: string; blocked_id: string }[];
      setIsBlocked(rows.some((row) => row.blocker_id === session.user.id));
      setIsBlockingMe(rows.some((row) => row.blocker_id === profile.id));
    };

    void loadBlockState();

    return () => {
      active = false;
    };
  }, [profile?.id, session?.user?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    let active = true;

    const loadFollowState = async () => {
      const currentUserId = session?.user?.id ?? null;

      const [
        { count: nextFollowerCount, error: followerError },
        { count: nextFollowingCount, error: followingError },
        followResponse,
      ] = await Promise.all([
        supabase
          .from("user_follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", profile.id),
        supabase
          .from("user_follows")
          .select("following_id", { count: "exact", head: true })
          .eq("follower_id", profile.id),
        currentUserId && currentUserId !== profile.id
          ? supabase
              .from("user_follows")
              .select("following_id")
              .eq("follower_id", currentUserId)
              .eq("following_id", profile.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (!active) return;

      if (followerError || followingError || followResponse.error) {
        console.error("Failed to load follow state:", followerError || followingError || followResponse.error);
        return;
      }

      setFollowerCount(nextFollowerCount || 0);
      setFollowingCount(nextFollowingCount || 0);
      setIsFollowing(Boolean(followResponse.data));
    };

    void loadFollowState();

    return () => {
      active = false;
    };
  }, [profile?.id, session?.user?.id]);

  const blackcardAccessActive = hasBlackcardAccess(membership, false);
  const isOwnProfile = Boolean(session?.user?.id && profile?.id === session.user.id);
  const ridingTags = useMemo(() => {
    if (!profile) return [] as string[];
    return [profile.riding_style, ...(profile.profile_tags || [])]
      .filter(Boolean)
      .map((item) => item as string)
      .slice(0, 4);
  }, [profile]);

  if (profileState === "idle" || profileState === "loading") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-6 lg:px-8">
          <ProfileSkeleton />
        </div>
      </main>
    );
  }

  if (!profile || profileState === "error") {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#e87a82]">Profile</p>
          <h1 className="mt-4 font-serif text-4xl">Profile could not be loaded</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
            This public member profile is unavailable right now.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300"
          >
            Return
          </Link>
        </div>
      </main>
    );
  }

  if (profile.status === "suspended" || profile.status === "blocked") {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Account Status</p>
          <h2 className="mt-4 font-serif text-5xl text-white">Access Restricted</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
            This member profile is not available.
          </p>
        </div>
      </main>
    );
  }

  const displayName = profileDisplayName(profile);
  const avatarUrl = profile.profile_image_url || profile.avatar_url;
  const socialLinks = [
    ["Instagram", normalizeSocialUrl(profile.instagram_url)],
    ["TikTok", normalizeSocialUrl(profile.tiktok_url)],
    ["YouTube", normalizeSocialUrl(profile.youtube_url)],
    ["Website", normalizeSocialUrl(profile.website_url)],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const badges = [
    blackcardAccessActive ? "Blackcard" : null,
    profile.membership_status === "active" ? "Member" : null,
    profile.bike_type ? profile.bike_type : null,
  ].filter(Boolean) as string[];

  async function toggleBlock() {
    if (!session?.user?.id || !profile?.id || isOwnProfile || safetyBusy) return;

    setSafetyBusy(true);
    setSafetyMessage(null);

    if (isBlocked) {
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", session.user.id)
        .eq("blocked_id", profile.id);

      if (error) {
        setSafetyMessage(error.message || "Could not unblock this rider.");
      } else {
        setIsBlocked(false);
        setSafetyMessage("Rider unblocked.");
      }
    } else {
      const { error } = await supabase.from("user_blocks").upsert(
        {
          blocker_id: session.user.id,
          blocked_id: profile.id,
          reason: "profile_block",
        },
        { onConflict: "blocker_id,blocked_id" },
      );

      if (error) {
        setSafetyMessage(error.message || "Could not block this rider.");
      } else {
        setIsBlocked(true);
        setSafetyMessage("Rider blocked. They cannot message you.");
      }
    }

    setSafetyBusy(false);
    window.setTimeout(() => setSafetyMessage(null), 2600);
  }

  async function submitReport() {
    if (!session?.user?.id || !profile?.id || isOwnProfile || safetyBusy) return;

    setSafetyBusy(true);
    setSafetyMessage(null);

    const { error } = await supabase.from("user_reports").insert({
      reporter_id: session.user.id,
      reported_user_id: profile.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });

    if (error) {
      setSafetyMessage(error.message || "Could not submit report.");
    } else {
      setReportOpen(false);
      setReportDetails("");
      setSafetyMessage("Report submitted for review.");
      window.setTimeout(() => setSafetyMessage(null), 2600);
    }

    setSafetyBusy(false);
  }

  async function toggleFollow() {
    const currentUserId = session?.user?.id;
    if (!currentUserId || !profile?.id || isOwnProfile || followBusy || isBlocked || isBlockingMe) return;

    setFollowBusy(true);
    setSafetyMessage(null);

    if (isFollowing) {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profile.id);

      if (error) {
        setSafetyMessage(error.message || "Could not unfollow this rider.");
      } else {
        setIsFollowing(false);
        setFollowerCount((count) => Math.max(0, count - 1));
      }

      setFollowBusy(false);
      return;
    }

    const { error } = await supabase.from("user_follows").insert({
      follower_id: currentUserId,
      following_id: profile.id,
    });

    if (error && error.code !== "23505") {
      setSafetyMessage(error.message || "Could not follow this rider.");
    } else {
      setIsFollowing(true);
      setFollowerCount((count) => count + (error?.code === "23505" ? 0 : 1));
    }

    setFollowBusy(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.25),transparent_65%)]" />

      <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.34em] text-zinc-500">Public Profile</span>
            <h1 className="mt-2 font-serif text-3xl leading-none text-white sm:text-4xl">
              {displayName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:max-w-[70%] sm:justify-end">
            {isOwnProfile && (
              <Link
                href="/profile"
                className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/12 px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-[#e87a82] transition hover:border-[#b4141e]/65"
              >
                Private Profile
              </Link>
            )}
            <Link
              href="/dashboard"
              className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              Back to Feed
            </Link>
            {!isOwnProfile && session?.user?.id && (
              <>
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                >
                  Report
                </button>
                <button
                  type="button"
                  onClick={() => void toggleBlock()}
                  disabled={safetyBusy}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82] disabled:opacity-60"
                >
                  {isBlocked ? "Unblock" : "Block"}
                </button>
              </>
            )}
          </div>
        </div>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)]">
          <div className="relative px-5 py-6 sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,20,30,0.12),transparent_32%)]" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/60 bg-black shadow-[0_0_40px_-10px_rgba(180,20,30,0.8)] sm:h-28 sm:w-28">
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
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.24),transparent_58%)] font-serif text-3xl text-[#f0c8cb]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-[32px] leading-none text-white sm:text-[42px]">
                      {displayName}
                    </h2>
                    {badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/12 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#e87a82]"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <p className="mt-2 break-words text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    {profileHandle(profile)} · {profileLocation(profile)}
                  </p>

                  {profile.quote?.trim() && (
                    <p className="mt-3 max-w-xl font-serif text-lg italic leading-7 text-zinc-300">
                      “{profile.quote.trim()}”
                    </p>
                  )}

                  {profile.bio?.trim() && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{profile.bio.trim()}</p>
                  )}

                  {(isBlocked || isBlockingMe) && (
                    <div className="mt-4 rounded-2xl border border-[#b4141e]/35 bg-[#b4141e]/10 px-4 py-3 text-sm text-[#f1c3c7]">
                      {isBlocked
                        ? "You blocked this rider. Direct interaction is disabled."
                        : "This rider is not available for direct interaction."}
                    </div>
                  )}

                  <div className={`mt-4 grid gap-2 sm:max-w-sm ${isOwnProfile || !session?.user?.id ? "grid-cols-2" : "grid-cols-3"}`}>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-2 text-center">
                      <p className="text-sm text-zinc-100">{followerCount}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">Followers</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-2 text-center">
                      <p className="text-sm text-zinc-100">{followingCount}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">Following</p>
                    </div>
                    {!isOwnProfile && session?.user?.id && (
                      <button
                        type="button"
                        onClick={() => void toggleFollow()}
                        disabled={followBusy || isBlocked || isBlockingMe}
                        className={`rounded-2xl border px-3 py-2 text-[9px] uppercase tracking-[0.18em] transition disabled:opacity-60 ${
                          isFollowing
                            ? "border-[#b4141e]/35 bg-[#b4141e]/12 text-[#e87a82] hover:border-[#b4141e]/65"
                            : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                        }`}
                      >
                        {followBusy
                          ? "Saving"
                          : isBlocked || isBlockingMe
                            ? "Unavailable"
                            : isFollowing
                              ? "Following"
                              : "Follow"}
                      </button>
                    )}
                  </div>

                  {socialLinks.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {socialLinks.map(([label, href]) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {ridingTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 flex gap-2 border-b border-white/10 pb-3">
          {(["posts", "garage", "rides"] as const).map((nextTab) => (
            <button
              key={nextTab}
              type="button"
              onClick={() => setTab(nextTab)}
              className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.24em] transition ${
                tab === nextTab
                  ? "border border-[#b4141e]/35 bg-[#b4141e]/12 text-[#e87a82]"
                  : "border border-white/10 bg-white/[0.03] text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {nextTab === "garage" ? "Garage" : nextTab === "rides" ? "Rides" : "Posts"}
            </button>
          ))}
        </div>

        {tab === "posts" && (
          <section className="mt-5">
            {postsState === "loading" && (
              <EmptyPanel title="Loading posts." body="Gathering this rider's latest archive." />
            )}

            {postsState === "error" && (
              <EmptyPanel title="Posts could not load." body="The profile is still available while the grid retries later." />
            )}

            {postsState === "loaded" && posts.length === 0 && (
              <EmptyPanel title="No posts yet." body="This rider has not shared anything publicly yet." />
            )}

            {postsState === "loaded" && posts.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                {posts.map((post, index) => {
                  const imageUrl = getBestImageUrl(
                    post.image_thumbnail_url || post.image_display_url,
                    post.image_url,
                    "profileGrid",
                  );

                  const isStatus = post.post_type === "status";
                  const statusText = post.status_text || post.caption || "";
                  const statusClass = statusBgMap[post.status_bg || "noir"] || statusBgMap.noir;

                  return (
                    <div
                      key={post.id}
                      className="group relative aspect-square overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.02]"
                    >
                      {isStatus ? (
                        <div className={`flex h-full w-full items-center justify-center px-4 text-center ${statusClass}`}>
                          <p className="font-serif text-lg italic leading-snug text-white">
                            {statusText || "Status"}
                          </p>
                        </div>
                      ) : imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={post.caption || "Crimson Society post"}
                          fill
                          sizes="(max-width: 768px) 50vw, 320px"
                          priority={index < 2}
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs uppercase tracking-[0.2em] text-zinc-400">
                          {post.caption || "No image"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === "garage" && (
          <section className="mt-5">
            {garageState === "loading" && (
              <EmptyPanel title="Loading garage." body="Pulling this rider's machines from Supabase." />
            )}

            {garageState === "error" && (
              <EmptyPanel title="Garage could not load." body="Motorcycle details are unavailable right now." />
            )}

            {garageState === "loaded" && motorcycles.length === 0 && (
              <EmptyPanel title="No motorcycles listed." body="This rider has not added garage entries yet." />
            )}

            {garageState === "loaded" && motorcycles.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {motorcycles.map((bike, index) => (
                  <article
                    key={bike.id}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#0f0f10] to-[#070707]"
                  >
                    <div className="relative aspect-[4/3] bg-black">
                      {bike.photo_url ? (
                        <Image
                          src={bike.photo_url}
                          alt={`${bike.name || bike.label || "Motorcycle"} photo`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          priority={index === 0}
                          className="object-cover"
                          unoptimized={bike.photo_url.includes("supabase")}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.22),transparent_58%)] font-serif text-5xl text-[#f0c8cb]">
                          {bikeInitial(bike)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent" />
                    </div>
                    <div className="border-b border-white/10 px-5 py-5">
                      <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
                        {bike.label || "Garage"}
                      </p>
                      <h3 className="mt-3 font-serif text-3xl leading-none text-white">
                        {bike.name || "Unnamed Motorcycle"}
                      </h3>
                      <p className="mt-3 text-sm text-zinc-400">
                        {bike.year || "Year pending"} · {bike.finish || "Finish pending"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "rides" && (
          <section className="mt-5">
            {ridesState === "loading" && (
              <EmptyPanel title="Loading rides." body="Finding this rider's hosted meets." />
            )}

            {ridesState === "error" && (
              <EmptyPanel title="Rides could not load." body="Hosted meet history is unavailable right now." />
            )}

            {ridesState === "loaded" && rides.length === 0 && (
              <EmptyPanel title="No rides listed." body="Hosted public meets will appear here." />
            )}

            {ridesState === "loaded" && rides.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {rides.map((ride) => (
                  <article
                    key={ride.id}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#0f0f10] to-[#070707]"
                  >
                    <div className="relative h-44 bg-black">
                      {ride.cover ? (
                        <Image
                          src={ride.cover}
                          alt={ride.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.26em] text-zinc-600">
                          Meet
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070707] via-transparent to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[9px] uppercase tracking-[0.18em] text-zinc-200 backdrop-blur">
                        {ride.tracking_status === "ended" ? "Completed" : "Upcoming"}
                      </span>
                    </div>

                    <div className="p-5">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-[#e87a82]">
                        {ride.date} / {formatRideTime(ride.time)}
                      </p>
                      <h3 className="mt-2 font-serif text-3xl leading-none text-white">
                        {ride.name}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        {ride.meet_point} to {ride.destination}
                      </p>
                      <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                        {ride.distance || "Distance pending"} / {ride.duration || "Duration pending"}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Report Profile</p>
                <h2 className="mt-2 font-serif text-3xl text-white">{displayName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400"
              >
                Close
              </button>
            </div>

            <label className="mt-5 block text-[10px] uppercase tracking-[0.24em] text-zinc-500">
              Reason
              <select
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none"
              >
                <option className="bg-black" value="Harassment or abuse">Harassment or abuse</option>
                <option className="bg-black" value="Spam or scam">Spam or scam</option>
                <option className="bg-black" value="Impersonation">Impersonation</option>
                <option className="bg-black" value="Unsafe behavior">Unsafe behavior</option>
                <option className="bg-black" value="Other">Other</option>
              </select>
            </label>

            <label className="mt-4 block text-[10px] uppercase tracking-[0.24em] text-zinc-500">
              Details
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Optional context for moderators"
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-zinc-600"
              />
            </label>

            <button
              type="button"
              onClick={() => void submitReport()}
              disabled={safetyBusy}
              className="mt-5 w-full rounded-xl border border-[#b4141e]/60 bg-[#b4141e]/20 py-3 text-[10px] uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:bg-[#b4141e]/30 disabled:opacity-60"
            >
              {safetyBusy ? "Submitting" : "Submit Report"}
            </button>
          </div>
        </div>
      )}

      {safetyMessage && (
        <div className="fixed bottom-24 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
          {safetyMessage}
        </div>
      )}
    </main>
  );
}
