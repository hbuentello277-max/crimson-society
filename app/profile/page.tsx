"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

type ProfilePost = {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string | null;
};

type Motorcycle = {
  id: string;
  label: string;
  name: string;
  year: string;
  finish: string;
};

type MotorcycleRow = {
  id: string;
  label: string | null;
  name: string | null;
  year: string | null;
  finish: string | null;
};

type ProfileDetails = {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  location: string | null;
  quote: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  website_url: string | null;
  profile_image_url: string | null;
};

type ProfileSummary = {
  display_name?: string | null;
  username?: string | null;
  profile_image_url?: string | null;
};

type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | null;

type MembershipRow = {
  status: SubscriptionStatus;
  plan_type: string | null;
  current_period_end: string | null;
};

type TabKey = "posts" | "rides" | "garage" | "saved" | "blackcard";
type LoadState = "idle" | "loading" | "loaded" | "error";

const baseTabs = [
  { k: "posts", label: "Posts" },
  { k: "rides", label: "Rides" },
  { k: "garage", label: "Garage" },
  { k: "saved", label: "Saved" },
] as const;

const fallbackProfile: ProfileDetails = {
  display_name: "Crimson Member",
  username: "member",
  bio: "Motorcycles, midnight city runs, and the discipline that keeps the machine sharp.",
  location: "Location pending",
  quote: "Bound by the road. Kept by the code.",
  instagram_url: null,
  tiktok_url: null,
  youtube_url: null,
  website_url: null,
  profile_image_url: null,
};

function normalizeUrl(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function mapMotorcycle(bike: MotorcycleRow): Motorcycle {
  return {
    id: bike.id,
    label: bike.label ?? "Garage",
    name: bike.name ?? "",
    year: bike.year ?? "",
    finish: bike.finish ?? "",
  };
}

function hasActiveMembership(membership: MembershipRow | null) {
  if (!membership) return false;
  if (membership.status !== "active" && membership.status !== "trialing") {
    return false;
  }
  if (!membership.current_period_end) return true;

  return new Date(membership.current_period_end).getTime() >= Date.now();
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded-full bg-white/10" />
        <div className="h-8 w-28 rounded-full bg-white/10" />
      </div>
      <div className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex gap-4">
          <div className="h-24 w-24 rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-8 w-44 rounded-full bg-white/10" />
            <div className="h-3 w-32 rounded-full bg-white/10" />
            <div className="h-4 w-full max-w-sm rounded-full bg-white/10" />
            <div className="h-4 w-3/4 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <div className="mt-5 flex gap-2 rounded-full border border-white/10 bg-white/[0.02] p-1">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-10 flex-1 rounded-full bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function RestrictedAccountScreen({ status }: { status: string }) {
  const isBlocked = status === "blocked";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
        Account Status
      </p>
      <h2 className="mt-4 font-serif text-5xl text-white">
        Access Restricted
      </h2>
      <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
        {isBlocked
          ? "Your account has been blocked. Access is no longer available."
          : "Your account has been suspended. You cannot use app features right now."}
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
      >
        Back to Login
      </Link>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  mark,
}: {
  href: string;
  label: string;
  mark: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10 hover:text-[#f0c8cb]"
    >
      {mark}
    </a>
  );
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
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">
        {body}
      </p>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="aspect-square animate-pulse rounded-[22px] border border-white/5 bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { session, loading: authLoading, profile, status, isAdmin } = useAuth();
  const [tab, setTab] = useState<TabKey>("posts");
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [postsState, setPostsState] = useState<LoadState>("idle");
  const [garageState, setGarageState] = useState<LoadState>("idle");
  const [profileState, setProfileState] = useState<LoadState>("idle");
  const [postCount, setPostCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [membership, setMembership] = useState<MembershipRow | null>(null);

  const userId = session?.user?.id ?? null;
  const authProfile = profile as ProfileSummary | null;

  const activeProfile = useMemo<ProfileDetails>(() => {
    return {
      ...fallbackProfile,
      ...details,
      display_name:
        details?.display_name ?? authProfile?.display_name ?? fallbackProfile.display_name,
      username: details?.username ?? authProfile?.username ?? fallbackProfile.username,
      profile_image_url:
        details?.profile_image_url ??
        authProfile?.profile_image_url ??
        fallbackProfile.profile_image_url,
    };
  }, [authProfile, details]);

  const displayName = activeProfile.display_name?.trim() || "Crimson Member";
  const username = activeProfile.username?.trim().replace(/^@+/, "") || "member";
  const displayUsername = `@${username}`;
  const displayLocation = activeProfile.location?.trim() || "Location pending";
  const displayQuote =
    activeProfile.quote?.trim() || "Bound by the road. Kept by the code.";
  const displayBio =
    activeProfile.bio?.trim() ||
    "Motorcycles, midnight city runs, and the discipline that keeps the machine sharp.";
  const avatarUrl = avatarFailed ? "" : activeProfile.profile_image_url?.trim() ?? "";

  const instagramUrl = normalizeUrl(activeProfile.instagram_url);
  const tiktokUrl = normalizeUrl(activeProfile.tiktok_url);
  const youtubeUrl = normalizeUrl(activeProfile.youtube_url);
  const websiteUrl = normalizeUrl(activeProfile.website_url);
  const membershipActive = hasActiveMembership(membership);
  const visibleTabs = useMemo(
    () =>
      membershipActive
        ? [...baseTabs, { k: "blackcard" as const, label: "Blackcard Member" }]
        : baseTabs,
    [membershipActive]
  );

  const stats = useMemo(
    () => [
      { n: "62", label: "Rides" },
      { n: "148", label: "Connections" },
      { n: String(postCount), label: "Posts" },
    ],
    [postCount]
  );

  useEffect(() => {
    if (!userId) return;
    setAvatarFailed(false);
  }, [userId, activeProfile.profile_image_url]);

  useEffect(() => {
    let cancelled = false;

    async function loadMainProfile() {
      if (authLoading || !userId) return;
      if (!profile) {
        setErrorMsg("Your profile could not be loaded.");
        return;
      }
      if (status === "suspended" || status === "blocked") return;

      setProfileState("loading");
      setErrorMsg("");

      const [profileResponse, countResponse, membershipResponse] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "display_name, username, bio, location, quote, instagram_url, tiktok_url, youtube_url, website_url, profile_image_url"
          )
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("Posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase
          .from("subscriptions")
          .select("status, plan_type, current_period_end")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (profileResponse.error) {
        setErrorMsg("Could not load profile details.");
        setProfileState("error");
        return;
      }

      setDetails((profileResponse.data as ProfileDetails | null) ?? null);
      setPostCount(countResponse.count ?? 0);
      setMembership((membershipResponse.data as MembershipRow | null) ?? null);
      setProfileState("loaded");
    }

    void loadMainProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, profile, status, userId]);

  useEffect(() => {
    if (!membershipActive && tab === "blackcard") {
      setTab("posts");
    }
  }, [membershipActive, tab]);

  const loadPosts = useCallback(async () => {
    if (!userId || postsState === "loading" || postsState === "loaded") return;

    setPostsState("loading");
    const response = await supabase
      .from("Posts")
      .select("id, user_id, image_url, caption, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (response.error) {
      setPostsState("error");
      return;
    }

    const nextPosts = (response.data as ProfilePost[]) ?? [];
    setPosts(nextPosts);
    setPostCount(nextPosts.length);
    setPostsState("loaded");
  }, [postsState, userId]);

  const loadGarage = useCallback(async () => {
    if (!userId || garageState === "loading" || garageState === "loaded") return;

    setGarageState("loading");
    const response = await supabase
      .from("motorcycles")
      .select("id, label, name, year, finish")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (response.error) {
      setGarageState("error");
      return;
    }

    setMotorcycles(((response.data ?? []) as MotorcycleRow[]).map(mapMotorcycle));
    setGarageState("loaded");
  }, [garageState, userId]);

  useEffect(() => {
    if (tab === "posts") void loadPosts();
    if (tab === "garage") void loadGarage();
  }, [loadGarage, loadPosts, tab]);

  async function handleShareProfile() {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : "/profile";

    try {
      if (typeof navigator !== "undefined" && navigator.share && session?.user) {
        await navigator.share({
          title: `${displayName} • Crimson Society`,
          text: `${displayName} ${displayUsername}`,
          url: shareUrl,
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      return;
    }
  }

  if (authLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(180,20,30,0.25), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-6 lg:px-8">
          <ProfileSkeleton />
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#e87a82]">
            Crimson Society
          </p>
          <h1 className="mt-4 font-serif text-4xl">Sign in to view profile</h1>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#f1c3c7]"
          >
            Login
          </Link>
        </div>
      </main>
    );
  }

  if (status === "suspended" || status === "blocked") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(180,20,30,0.25), transparent 65%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-28 pt-12">
          <RestrictedAccountScreen status={status} />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, rgba(180,20,30,0.25), transparent 65%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#b4141e]/70 to-transparent" />

      <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.34em] text-zinc-500">
            Profile
          </span>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[#e87a82]"
              >
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={handleShareProfile}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              Share
            </button>
            <Link
              href="/profile/edit"
              className="rounded-full border border-[#b4141e]/35 bg-[#b4141e]/12 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[#f1c3c7] transition hover:border-[#b4141e]/65 hover:bg-[#b4141e]/18"
            >
              Edit Identity
            </Link>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        <section className="mt-5 overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)]">
          <div className="relative px-5 py-6 sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,20,30,0.12),transparent_32%)]" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/60 bg-black shadow-[0_0_40px_-10px_rgba(180,20,30,0.8)] sm:h-28 sm:w-28">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={`${displayName} profile picture`}
                      fill
                      sizes="112px"
                      className="object-cover"
                      onError={() => setAvatarFailed(true)}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.24),transparent_58%)] font-serif text-3xl text-[#f0c8cb]">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="min-w-0 pt-1">
                  <h1 className="font-serif text-[32px] leading-none text-white sm:text-[42px]">
                    {displayName}
                  </h1>
                  <p className="mt-2 break-words text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                    {displayUsername} · {displayLocation}
                  </p>
                  <p className="mt-3 max-w-xl font-serif text-lg italic leading-7 text-zinc-300">
                    “{displayQuote}”
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                    {displayBio}
                  </p>

                  {(instagramUrl || tiktokUrl || youtubeUrl || websiteUrl) && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {instagramUrl && (
                        <SocialIcon href={instagramUrl} label="Instagram" mark="IG" />
                      )}
                      {tiktokUrl && (
                        <SocialIcon href={tiktokUrl} label="TikTok" mark="TT" />
                      )}
                      {youtubeUrl && (
                        <SocialIcon href={youtubeUrl} label="YouTube" mark="YT" />
                      )}
                      {websiteUrl && (
                        <SocialIcon href={websiteUrl} label="Website" mark="WEB" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:w-[280px]">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[16px] border border-white/10 bg-black/20 px-2 py-3 text-center backdrop-blur-sm"
                  >
                    <p className="font-serif text-[24px] leading-none text-white">
                      {stat.n}
                    </p>
                    <p className="mt-2 text-[8px] uppercase tracking-[0.16em] text-zinc-500">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Link
          href="/blackcard"
          className="mt-4 block rounded-[20px] border border-[#b4141e]/25 bg-[#090909]/90 px-5 py-4 shadow-[0_0_42px_-28px_rgba(180,20,30,0.9)] transition hover:border-[#b4141e]/50"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.32em] text-[#e87a82]">
                BLACKCARD ACCESS
              </p>
              <h2 className="mt-1 font-serif text-xl text-white">
                {membershipActive ? "Blackcard Member" : "Blackcard Access"}
              </h2>
            </div>
            <span className="text-xl text-[#b4141e]">✦</span>
          </div>
        </Link>

        {profileState === "loading" && (
          <p className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            Refining profile details
          </p>
        )}

        <div className="mt-6 flex gap-1 rounded-full border border-white/10 bg-white/[0.02] p-1">
          {visibleTabs.map((item) => (
            <button
              key={item.k}
              type="button"
              onClick={() => setTab(item.k)}
              className={`min-h-10 flex-1 rounded-full px-1 text-[10px] uppercase tracking-[0.18em] transition sm:text-xs sm:tracking-[0.28em] ${
                tab === item.k
                  ? "bg-[#b4141e]/30 text-[#e87a82]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "posts" && (
          <section className="mt-5">
            {postsState === "loading" && <TabSkeleton />}
            {postsState === "error" && (
              <EmptyPanel
                title="Posts could not load."
                body="The profile stays available while the grid retries later."
              />
            )}
            {postsState === "loaded" && posts.length === 0 && (
              <EmptyPanel
                title="No posts yet."
                body="The visual archive of ride life will appear here."
              />
            )}
            {postsState === "loaded" && posts.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="group relative aspect-square overflow-hidden rounded-[20px] border border-white/5 bg-white/[0.02]"
                  >
                    {post.image_url ? (
                      <Image
                        src={post.image_url}
                        alt={post.caption || "Crimson Society post"}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 320px"
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs uppercase tracking-[0.2em] text-zinc-400">
                        {post.caption || "No image available"}
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 opacity-0 transition duration-300 group-hover:opacity-100">
                      <p className="line-clamp-2 text-xs uppercase tracking-[0.16em] text-zinc-200">
                        {post.caption || "Crimson Society"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "rides" && (
          <section className="mt-5">
            <EmptyPanel
              title="Your ride history will live here."
              body="Past routes, late-night runs, and future mileage belong in this archive."
            />
          </section>
        )}

        {tab === "garage" && (
          <section className="mt-5">
            {garageState === "loading" && <TabSkeleton />}
            {garageState === "error" && (
              <EmptyPanel
                title="Garage could not load."
                body="Motorcycle details are kept separate from the public profile shell."
              />
            )}
            {garageState === "loaded" && motorcycles.length === 0 && (
              <EmptyPanel
                title="No motorcycles listed."
                body="Garage entries can be added from profile editing."
              />
            )}
            {garageState === "loaded" && motorcycles.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {motorcycles.map((bike) => (
                  <article
                    key={bike.id}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#0f0f10] to-[#070707] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)]"
                  >
                    <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.14),transparent_48%)] px-5 py-5">
                      <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-500">
                        {bike.label || "Garage"}
                      </p>
                      <h3 className="mt-3 font-serif text-3xl leading-none text-white">
                        {bike.name || "Unnamed Motorcycle"}
                      </h3>
                      <p className="mt-3 text-sm text-zinc-400">
                        {bike.year || "Year pending"} ·{" "}
                        {bike.finish || "Finish pending"}
                      </p>
                    </div>
                    <div className="px-5 py-5">
                      <div className="flex items-center gap-4">
                        <span className="h-px w-10 bg-white/15" />
                        <span className="text-[#b4141e]">✦</span>
                        <span className="h-px w-10 bg-white/15" />
                      </div>
                      <p className="mt-5 text-sm leading-7 text-zinc-500">
                        Every machine in the garage becomes part of the member story.
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "saved" && (
          <section className="mt-5">
            <EmptyPanel
              title="Posts you’ve saved appear here."
              body="Keep references, builds, and visuals that inspire your next move."
            />
          </section>
        )}

        {tab === "blackcard" && membershipActive && (
          <section className="mt-5">
            <div className="rounded-[26px] border border-[#b4141e]/25 bg-[#090909] p-6 shadow-[0_20px_70px_-45px_rgba(180,20,30,0.95)]">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                Apex Status
              </p>
              <h3 className="mt-3 font-serif text-3xl text-white">
                Blackcard active
              </h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                {membership?.plan_type || "Apex"} membership is active for this
                profile.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
