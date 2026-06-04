"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { CompactProfileCard } from "@/components/profile/CompactProfileCard";
import { IconAdmin, IconEdit, IconShare } from "@/components/profile/ProfileIcons";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import type { AppProfile } from "@/lib/profile";
import { profileDisplayName, profileHandle, profileLocation } from "@/lib/profile";
import { useProfile } from "@/hooks/useProfile";
import { getBestImageUrl } from "@/lib/media";
import { resolveMembershipTier, type MembershipRow } from "@/lib/membership";
import {
  type AccountDeletionRequestRow,
  deletionStatusLabel,
  deletionStatusUserMessage,
  isOpenDeletionStatus,
} from "@/lib/account-deletion";
import { supabase } from "@/lib/supabase";
import { authedFetch } from "@/lib/auth/authed-fetch";
import { CS_PROFILE_BTN_PRIMARY, CS_PROFILE_BTN_SOFT } from "@/lib/crimson-accent";
import { SavedPostsPanel } from "@/components/social/SavedPostsPanel";

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

type ProfileStats = {
posts: number;
followers: number;
following: number;
};

const statusBgMap: Record<string, string> = {
noir: "bg-gradient-to-br from-[#050505] via-[#0c0c0d] to-[#050505]",
crimson: "bg-gradient-to-br from-[#3a0709] via-[#b4141e] to-[#3a0709]",
carbon: "bg-gradient-to-br from-[#1a1a1c] via-[#2a2a2e] to-[#0a0a0c]",
ember: "bg-gradient-to-br from-[#1a0405] via-[#6a0d14] to-[#0a0102]",
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

type LoadState = "idle" | "loading" | "loaded" | "error";

function EmptyPanel({ title, body }: { title: string; body: string }) {
return ( <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-8 text-center shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)]"> <div className="mx-auto flex items-center justify-center gap-4"> <span className="h-px w-10 bg-white/15" /> <span className="text-[#b4141e]">✦</span> <span className="h-px w-10 bg-white/15" /> </div> <p className="mt-5 font-serif text-2xl italic text-zinc-300">{title}</p> <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">{body}</p> </div>
);
}

function bikeInitial(bike: Motorcycle) {
return (bike.name?.trim() || bike.label?.trim() || "G").charAt(0).toUpperCase();
}

function getProfileUrl(username?: string | null) {
const cleanUsername = username?.trim().replace(/^@+/, "");
const path = cleanUsername ? `/profile/${encodeURIComponent(cleanUsername)}` : "/profile";

if (typeof window === "undefined") return path;

return new URL(path, window.location.origin).toString();
}

function ProfileSkeleton() {
return ( <div className="animate-pulse"> <div className="h-3 w-28 rounded-full bg-white/10" /> <div className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.03] p-6"> <div className="flex gap-4"> <div className="h-24 w-24 rounded-full bg-white/10" /> <div className="min-w-0 flex-1 space-y-3"> <div className="h-8 w-44 rounded-full bg-white/10" /> <div className="h-3 w-32 rounded-full bg-white/10" /> <div className="h-4 w-full max-w-sm rounded-full bg-white/10" /> </div> </div> </div> </div>
);
}

function normalizeSocialUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function profileCardDetails(profile: AppProfile) {
  const socialLinks = [
    ["Instagram", normalizeSocialUrl(profile.instagram_url)],
    ["TikTok", normalizeSocialUrl(profile.tiktok_url)],
    ["YouTube", normalizeSocialUrl(profile.youtube_url)],
    ["Website", normalizeSocialUrl(profile.website_url)],
  ]
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([label, href]) => ({ label, href }));

  return {
    quote: profile.quote,
    bio: profile.bio,
    socialLinks,
  };
}

export default function ProfilePage() {
const { session, loading: authLoading, isAdmin, signOut, status: profileStatus } = useAuth();
const { profile, loading: profileLoading, error, refresh } = useProfile();
const userId = session?.user?.id ?? null;
const [tab, setTab] = useState<ProfileTab>("posts");
const [posts, setPosts] = useState<ProfilePost[]>([]);
const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
const [membership, setMembership] = useState<MembershipRow | null>(null);
const [postsState, setPostsState] = useState<LoadState>("idle");
const [garageState, setGarageState] = useState<LoadState>("idle");
const [openMenuId, setOpenMenuId] = useState<string | null>(null);
const [settingsOpen, setSettingsOpen] = useState(false);
const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
const [toast, setToast] = useState<string | null>(null);
const [deleteRequesting, setDeleteRequesting] = useState(false);
const [deleteRequestStatus, setDeleteRequestStatus] = useState<string | null>(null);
const [deleteModalOpen, setDeleteModalOpen] = useState(false);
const [deleteConfirmText, setDeleteConfirmText] = useState("");
const router = useRouter();
const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequestRow | null>(null);
const [deletionRequestLoading, setDeletionRequestLoading] = useState(false);
const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });

useEffect(() => {
if (!userId || authLoading) return;
const timer = window.setTimeout(() => {
void refresh();
}, 0);
return () => window.clearTimeout(timer);
}, [authLoading, refresh, userId]);

useEffect(() => {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem("openProfileAccountMenu") !== "1") return;
  window.sessionStorage.removeItem("openProfileAccountMenu");
  setSettingsOpen(true);
}, []);

useEffect(() => {
if (!userId) {
setDeletionRequest(null);
return;
}

const loadDeletionRequest = async () => {
setDeletionRequestLoading(true);
const { data, error } = await supabase
.from("account_deletion_requests")
.select("id, user_id, status, details, requested_at, reviewed_at, reviewed_by")
.eq("user_id", userId)
.order("requested_at", { ascending: false })
.limit(1)
.maybeSingle();

if (error) {
console.error("Failed to load account deletion request:", error);
setDeletionRequest(null);
} else {
setDeletionRequest((data as AccountDeletionRequestRow | null) ?? null);
}

setDeletionRequestLoading(false);
};

void loadDeletionRequest();
}, [userId]);

useEffect(() => {
  if (!authLoading && profileStatus === "deletion_pending") {
    router.replace("/deletion-pending");
  }
}, [authLoading, profileStatus, router]);


useEffect(() => {
if (!userId) return;

const loadMembership = async () => {
  const { data } = await supabase
    .from("subscriptions")
    .select("status, plan_type, current_period_end, created_at")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .or(`current_period_end.is.null,current_period_end.gte.${new Date().toISOString()}`)
    .order("current_period_end", { ascending: false, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  setMembership((data as MembershipRow | null) ?? null);
};

void loadMembership();

}, [userId]);

useEffect(() => {
if (!userId) {
  setStats({ posts: 0, followers: 0, following: 0 });
  return;
}

let active = true;

const loadStats = async () => {
  const [
    { count: postCount, error: postError },
    { count: followerCount, error: followerError },
    { count: followingCount, error: followingError },
  ] = await Promise.all([
    supabase
      .from("Posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("user_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("user_follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  if (!active) return;

  if (postError || followerError || followingError) {
    console.error("Failed to load profile stats:", postError || followerError || followingError);
    setStats({ posts: 0, followers: 0, following: 0 });
    return;
  }

  setStats({
    posts: postCount || 0,
    followers: followerCount || 0,
    following: followingCount || 0,
  });
};

void loadStats();

return () => {
  active = false;
};
}, [userId]);

const loadPosts = useCallback(async () => {
if (!userId || postsState === "loading" || postsState === "loaded") return;
setPostsState("loading");

const { data, error: postsError } = await supabase
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
  .eq("user_id", userId)
  .order("created_at", { ascending: false });

if (postsError) {
  setPostsState("error");
  return;
}

setPosts((data as ProfilePost[]) ?? []);
setStats((current) => ({ ...current, posts: data?.length ?? current.posts }));
setPostsState("loaded");

}, [postsState, userId]);

const loadGarage = useCallback(async () => {
if (!userId || garageState === "loading" || garageState === "loaded") return;
setGarageState("loading");

const { data, error: garageError } = await supabase
  .from("motorcycles")
  .select("id, label, name, year, finish, photo_url, photo_path")
  .eq("user_id", userId)
  .order("created_at", { ascending: true });

if (garageError) {
  setGarageState("error");
  return;
}

setMotorcycles((data as Motorcycle[]) ?? []);
setGarageState("loaded");

}, [garageState, userId]);

useEffect(() => {
const timer = window.setTimeout(() => {
if (tab === "posts") void loadPosts();
if (tab === "garage") void loadGarage();
}, 0);
return () => window.clearTimeout(timer);
}, [loadGarage, loadPosts, tab]);

const deletePost = async (postId: string) => {
if (!userId || deletingPostId) return;

const confirmed = window.confirm("Delete this post? This cannot be undone.");
if (!confirmed) return;

setDeletingPostId(postId);
setOpenMenuId(null);

let query = supabase.from("Posts").delete().eq("id", postId);

if (!isAdmin) {
  query = query.eq("user_id", userId);
}

const { error: deleteError } = await query;

if (deleteError) {
  setToast(deleteError.message || "Could not delete post.");
  setTimeout(() => setToast(null), 1800);
  setDeletingPostId(null);
  return;
}

setPosts((current) => current.filter((post) => post.id !== postId));
setStats((current) => ({ ...current, posts: Math.max(0, current.posts - 1) }));
setDeletingPostId(null);
setToast("Post deleted.");
setTimeout(() => setToast(null), 1400);

};

const requestAccountDeletion = async () => {
if (!userId || deleteRequesting) return;

if (deletionRequest && isOpenDeletionStatus(deletionRequest.status)) {
  setDeleteRequestStatus("You already have an open deletion request pending review.");
  return;
}

if (deleteConfirmText.trim() !== "DELETE") {
  setDeleteRequestStatus('Type DELETE in the confirmation field.');
  return;
}

setDeleteRequesting(true);
setDeleteRequestStatus(null);

try {
  const response = await authedFetch("/api/account/deletion-request", {
    method: "POST",
    body: JSON.stringify({ confirmation: deleteConfirmText.trim() }),
  });

  const result = (await response.json().catch(() => null)) as {
    error?: string;
    message?: string;
    authDetail?: string;
  } | null;

  if (!response.ok) {
    const detail = result?.authDetail ? ` (${result.authDetail})` : "";
    throw new Error((result?.error || "Could not submit deletion request.") + detail);
  }

  setDeleteModalOpen(false);
  setDeleteConfirmText("");
  setDeleteRequestStatus(null);
  setToast(result?.message || "Account deletion requested. Signing you out…");
  await signOut();
  router.replace("/login?deletion=requested");
} catch (error) {
  setDeleteRequestStatus(
    error instanceof Error ? error.message : "Could not submit deletion request.",
  );
}

setDeleteRequesting(false);
};

const shareProfile = async () => {
const profileUrl = getProfileUrl(profile?.username);
const title = profile?.display_name || profile?.full_name || profile?.username || "Crimson Society Profile";
const browserNavigator = typeof window !== "undefined" ? window.navigator : null;

const copyProfileUrl = async () => {
  if (!browserNavigator?.clipboard) throw new Error("Clipboard is unavailable.");
  await browserNavigator.clipboard.writeText(profileUrl);
};

try {
  if (browserNavigator && "share" in browserNavigator) {
    await browserNavigator.share({
      title,
      text: `View ${title} on Crimson Society`,
      url: profileUrl,
    });
    return;
  }

  await copyProfileUrl();
  setToast("Profile link copied.");
  setTimeout(() => setToast(null), 1400);
} catch (shareError) {
  if (shareError instanceof DOMException && shareError.name === "AbortError") return;

  try {
    await copyProfileUrl();
    setToast("Profile link copied.");
  } catch {
    setToast("Could not share profile.");
  }
  setTimeout(() => setToast(null), 1400);
}
};

const handleSignOut = async () => {
setSettingsOpen(false);
await signOut();
};

const tabs = useMemo(() => {
return [
{ k: "posts" as const, label: "Posts" },
{ k: "rides" as const, label: "Rides" },
{ k: "garage" as const, label: "Garage" },
{ k: "saved" as const, label: "Saved" },
];
}, []);

const membershipTier = resolveMembershipTier({ membership, isAdmin, profile: profile ?? undefined });

if (authLoading || profileLoading) {
return ( <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white"> <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-6 lg:px-8"> <ProfileSkeleton /> </div> </main>
);
}

if (!session?.user) {
return ( <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white"> <div> <p className="text-[11px] uppercase tracking-[0.35em] text-[#e87a82]">Crimson Society</p> <h1 className="mt-4 font-serif text-4xl">Sign in to view profile</h1> <Link
         href="/login"
         className="mt-8 inline-flex rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-[#f1c3c7]"
       >
Login </Link> </div> </main>
);
}

if (!profile) {
return ( <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white"> <div> <p className="text-[11px] uppercase tracking-[0.35em] text-[#e87a82]">Profile</p> <h1 className="mt-4 font-serif text-4xl">Profile could not be loaded</h1> <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
{error || "Try refreshing after your session is restored."} </p>
<button
onClick={() => void refresh()}
className="mt-8 rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300"
>
Retry </button> </div> </main>
);
}

if (profile.status === "suspended" || profile.status === "blocked") {
return ( <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white"> <div> <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Account Status</p> <h2 className="mt-4 font-serif text-5xl text-white">Access Restricted</h2> <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">
Your account cannot use app features right now. </p> </div> </main>
);
}

return ( <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white"> <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.25),transparent_65%)]" />

  <div className="relative mx-auto max-w-5xl px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-[calc(env(safe-area-inset-top)+12px)] sm:px-6 lg:px-8">
    <div className="flex items-start justify-between gap-3">
      <div>
        <span className="text-[10px] uppercase tracking-[0.34em] text-zinc-500">Profile</span>
        <h1 className="mt-1 font-serif text-2xl leading-none text-white sm:text-3xl">Profile</h1>
      </div>

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-xl leading-none text-zinc-300 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
        aria-label="Open profile menu"
      >
        ⋯
      </button>
    </div>

    <CompactProfileCard
      displayName={profileDisplayName(profile)}
      handle={profileHandle(profile)}
      location={profileLocation(profile)}
      details={profileCardDetails(profile)}
      avatarUrl={profile.profile_image_url || profile.avatar_url}
      membershipTier={membershipTier}
      stats={[
        { label: "Posts", value: stats.posts },
        { label: "Followers", value: stats.followers, href: "/profile/followers" },
        { label: "Following", value: stats.following, href: "/profile/following" },
      ]}
      actions={
        <div className="grid gap-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <Link href="/profile/edit" className={CS_PROFILE_BTN_PRIMARY}>
              <IconEdit />
              Edit Profile
            </Link>
            <button type="button" onClick={() => void shareProfile()} className={CS_PROFILE_BTN_SOFT}>
              <IconShare />
              Share Profile
            </button>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className={`${CS_PROFILE_BTN_PRIMARY} w-full`}
            >
              <IconAdmin />
              Admin
            </Link>
          )}
        </div>
      }
    />

    <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />

    {tab === "posts" && (
      <section className="mt-3">
        {postsState === "loading" && (
          <EmptyPanel title="Loading posts." body="Gathering your latest ride archive." />
        )}

        {postsState === "error" && (
          <EmptyPanel
            title="Posts could not load."
            body="The profile stays available while the grid retries later."
          />
        )}

        {postsState === "loaded" && posts.length === 0 && (
          <EmptyPanel title="No posts yet." body="The visual archive of ride life will appear here." />
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
                  <div className="absolute right-2 top-2 z-20">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId((current) => (current === post.id ? null : post.id))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/65 text-lg leading-none text-white/75 backdrop-blur hover:border-white/25 hover:text-white"
                      aria-label="Post options"
                    >
                      ⋯
                    </button>

                    {openMenuId === post.id && (
                      <div className="absolute right-0 top-10 w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#090909] shadow-2xl">
                        <button
                          type="button"
                          onClick={() => void deletePost(post.id)}
                          disabled={deletingPostId === post.id}
                          className="w-full px-4 py-3 text-left text-xs uppercase tracking-[0.2em] text-[#e87a82] hover:bg-[#b4141e]/15 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingPostId === post.id ? "Deleting" : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>

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
      <section className="mt-3">
        {garageState === "loading" && (
          <EmptyPanel title="Loading garage." body="Pulling your machines from Supabase." />
        )}

        {garageState === "error" && (
          <EmptyPanel
            title="Garage could not load."
            body="Motorcycle details are kept separate from the public profile shell."
          />
        )}

        {garageState === "loaded" && motorcycles.length === 0 && (
          <EmptyPanel title="No motorcycles listed." body="Garage entries can be added from profile editing." />
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

    {tab === "saved" && (
      <SavedPostsPanel viewerId={userId ?? undefined} isOwnProfile />
    )}

    {tab !== "posts" && tab !== "garage" && tab !== "saved" && (
      <section className="mt-3">
        <EmptyPanel
          title="Coming into focus."
          body="This profile section is wired to shared state and ready for the next data layer."
        />
      </section>
    )}
  </div>

  {settingsOpen && (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close profile menu"
        className="absolute inset-0 cursor-default"
        onClick={() => setSettingsOpen(false)}
      />
      <section className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#080809] shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Profile Menu</p>
            <h2 className="mt-1 font-serif text-2xl text-white">Settings</h2>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-xl text-zinc-300 transition hover:border-white/25 hover:text-white"
            aria-label="Close profile menu"
          >
            ×
          </button>
        </div>

        <div className="max-h-[78dvh] overflow-y-auto px-3 py-3">
          <div className="grid gap-2">
            {[
              { href: "/profile/edit", label: "Settings" },
              { href: "/inbox?tab=notifications", label: "Notifications" },
              { href: "/privacy", label: "Privacy" },
              { href: "/rides/track?live=1", label: "Location Sharing" },
              { href: "/blackcard", label: "Blackcard" },
              { href: "/safety", label: "Safety" },
              { href: "/support", label: "Support" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                prefetch
                onClick={() => setSettingsOpen(false)}
                className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm text-zinc-200 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
              >
                {item.label}
              </Link>
            ))}

            {isAdmin && (
              <Link
                href="/admin"
                prefetch
                onClick={() => setSettingsOpen(false)}
                className="rounded-2xl border border-[#b4141e]/35 bg-[#b4141e]/12 px-4 py-3 text-sm text-[#f1c3c7] transition hover:border-[#b4141e]/70"
              >
                Admin Dashboard
              </Link>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Crimson Credits</p>
            <p className="mt-2 text-xs leading-5 text-zinc-600">Coming soon</p>
            <div className="mt-3 grid gap-2">
              {[
                "Credits History",
                "Referrals",
                "Rewards",
                "How It Works",
              ].map((label) => (
                <div
                  key={label}
                  className="cursor-not-allowed rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-xs uppercase tracking-[0.16em] text-zinc-600"
                  aria-disabled
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Safety</p>
            <div className="mt-3 grid gap-2">
              {[
                { href: "/community-guidelines", label: "Community Guidelines" },
                { href: "/terms", label: "Terms of Service" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/safety", label: "Safety Policy" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-xl border border-white/10 px-3 py-2.5 text-xs uppercase tracking-[0.16em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                >
                  {item.label}
                </Link>
              ))}

              <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Account deletion</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  You will be signed out immediately. Your account enters deletion_pending until an admin
                  approves. You can sign back in only to check status or cancel while pending.
                </p>
                <Link
                  href="/account-deletion"
                  prefetch
                  onClick={() => setSettingsOpen(false)}
                  className="mt-2 inline-block text-[10px] uppercase tracking-[0.16em] text-[#e87a82] hover:underline"
                >
                  How account deletion works
                </Link>
                {deletionRequestLoading ? (
                  <p className="mt-3 text-xs leading-5 text-zinc-600">Loading request status…</p>
                ) : deletionRequest ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">
                      Status: {deletionStatusLabel(deletionRequest.status)}
                    </p>
                    <p className="text-xs leading-5 text-zinc-500">
                      {deletionStatusUserMessage(deletionRequest)}
                    </p>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmText("");
                  setDeleteRequestStatus(null);
                  setDeleteModalOpen(true);
                }}
                disabled={
                  deleteRequesting ||
                  deletionRequestLoading ||
                  profileStatus === "deletion_pending" ||
                  Boolean(deletionRequest && isOpenDeletionStatus(deletionRequest.status))
                }
                className="rounded-xl border border-[#b4141e]/50 bg-[#b4141e]/15 px-3 py-2.5 text-left text-xs uppercase tracking-[0.16em] text-[#f1c3c7] transition hover:bg-[#b4141e]/25 disabled:opacity-60"
              >
                {deletionRequest && isOpenDeletionStatus(deletionRequest.status)
                  ? "Deletion Request Pending"
                  : "Request Account Deletion"}
              </button>

              {deletionRequest && isOpenDeletionStatus(deletionRequest.status) && (
                <Link
                  href="/deletion-pending"
                  prefetch
                  onClick={() => setSettingsOpen(false)}
                  className="rounded-xl border border-white/10 px-3 py-2.5 text-xs uppercase tracking-[0.16em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                >
                  Manage deletion status
                </Link>
              )}

              {deleteRequestStatus && (
                <p className="px-1 text-xs leading-5 text-zinc-500">{deleteRequestStatus}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left text-sm text-zinc-200 transition hover:border-[#b4141e]/50 hover:text-[#f1c3c7]"
          >
            Log Out
          </button>
        </div>
      </section>
    </div>
  )}

  {deleteModalOpen && (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0d] p-5 shadow-2xl">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Confirm deletion</p>
        <h2 className="mt-2 font-serif text-2xl text-white">Delete your account?</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          This cannot be undone after admin approval. You will be signed out immediately. Type{" "}
          <span className="font-mono text-zinc-200">DELETE</span> below to continue.
        </p>
        <input
          type="text"
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder="DELETE"
          className="mt-4 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none focus:border-[#b4141e]/50"
        />
        {deleteRequestStatus && (
          <p className="mt-4 rounded-xl border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-3 text-sm leading-6 text-[#f0c9ce]">
            {deleteRequestStatus}
          </p>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={deleteRequesting}
            onClick={() => {
              setDeleteModalOpen(false);
              setDeleteConfirmText("");
            }}
            className="rounded-xl border border-white/10 px-4 py-3 text-xs uppercase tracking-[0.16em] text-zinc-400"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={deleteRequesting || deleteConfirmText.trim() !== "DELETE"}
            onClick={() => void requestAccountDeletion()}
            className="rounded-xl border border-[#b4141e]/50 bg-[#b4141e]/20 px-4 py-3 text-xs uppercase tracking-[0.16em] text-[#f1c3c7] disabled:opacity-50"
          >
            {deleteRequesting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </div>
    </div>
  )}

  {toast && (
    <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
      {toast}
    </div>
  )}
</main>

);
}
