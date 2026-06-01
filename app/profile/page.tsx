"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import { useProfile } from "@/hooks/useProfile";
import { getBestImageUrl } from "@/lib/media";
import { hasBlackcardAccess, type MembershipRow } from "@/lib/membership";
import { supabase } from "@/lib/supabase";

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

const statusBgMap: Record<string, string> = {
noir: "bg-gradient-to-br from-[#050505] via-[#0c0c0d] to-[#050505]",
crimson: "bg-gradient-to-br from-[#3a0709] via-[#b4141e] to-[#3a0709]",
carbon: "bg-gradient-to-br from-[#1a1a1c] via-[#2a2a2e] to-[#0a0a0c]",
ember: "bg-gradient-to-br from-[#1a0405] via-[#6a0d14] to-[#0a0102]",
};

const policyLinks = [
{ href: "/terms", label: "Terms" },
{ href: "/privacy", label: "Privacy" },
{ href: "/community-guidelines", label: "Guidelines" },
{ href: "/safety", label: "Safety" },
];

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

function ProfileSkeleton() {
return ( <div className="animate-pulse"> <div className="h-3 w-28 rounded-full bg-white/10" /> <div className="mt-6 rounded-[30px] border border-white/10 bg-white/[0.03] p-6"> <div className="flex gap-4"> <div className="h-24 w-24 rounded-full bg-white/10" /> <div className="min-w-0 flex-1 space-y-3"> <div className="h-8 w-44 rounded-full bg-white/10" /> <div className="h-3 w-32 rounded-full bg-white/10" /> <div className="h-4 w-full max-w-sm rounded-full bg-white/10" /> </div> </div> </div> </div>
);
}

function HeaderActionLink({
href,
children,
variant = "default",
}: {
href: string;
children: React.ReactNode;
variant?: "admin" | "premium" | "default";
}) {
const styles = {
admin:
"border-[#b4141e]/35 bg-[#b4141e]/12 text-[#e87a82] hover:border-[#b4141e]/65 hover:bg-[#b4141e]/18",
premium:
"border-[#b4141e]/40 bg-[linear-gradient(180deg,rgba(180,20,30,0.18),rgba(255,255,255,0.03))] text-[#f1c3c7] shadow-[0_0_28px_-22px_rgba(180,20,30,0.9)] hover:border-[#b4141e]/70",
default:
"border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25 hover:text-white",
};

return (
<Link
href={href}
className={`rounded-full border px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] transition ${styles[variant]}`}
>
{children} </Link>
);
}

function HeaderActionButton({
onClick,
children,
}: {
onClick: () => void;
children: React.ReactNode;
}) {
return ( <button
   type="button"
   onClick={onClick}
   className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition hover:border-white/25 hover:text-zinc-200"
 >
{children} </button>
);
}

export default function ProfilePage() {
const { session, loading: authLoading, isAdmin, signOut } = useAuth();
const { profile, loading: profileLoading, error, refresh } = useProfile();
const userId = session?.user?.id ?? null;
const [tab, setTab] = useState<ProfileTab>("posts");
const [posts, setPosts] = useState<ProfilePost[]>([]);
const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
const [membership, setMembership] = useState<MembershipRow | null>(null);
const [postsState, setPostsState] = useState<LoadState>("idle");
const [garageState, setGarageState] = useState<LoadState>("idle");
const [openMenuId, setOpenMenuId] = useState<string | null>(null);
const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
const [toast, setToast] = useState<string | null>(null);
const [deleteRequesting, setDeleteRequesting] = useState(false);
const [deleteRequestStatus, setDeleteRequestStatus] = useState<string | null>(null);

useEffect(() => {
if (!userId || authLoading) return;
const timer = window.setTimeout(() => {
void refresh();
}, 0);
return () => window.clearTimeout(timer);
}, [authLoading, refresh, userId]);

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
setDeletingPostId(null);
setToast("Post deleted.");
setTimeout(() => setToast(null), 1400);

};

const requestAccountDeletion = async () => {
if (!userId || deleteRequesting) return;

const confirmed = window.confirm(
  "Request account deletion? Your profile will be reviewed for safe removal. Shared ride, meet, and message history will not be deleted automatically during this beta flow."
);

if (!confirmed) return;

setDeleteRequesting(true);
setDeleteRequestStatus(null);

const { error } = await supabase.from("account_deletion_requests").insert({
  user_id: userId,
  details: "Requested from private profile safety controls.",
});

if (error) {
  setDeleteRequestStatus(error.code === "23505" ? "A deletion request is already pending." : error.message);
} else {
  setDeleteRequestStatus("Account deletion request submitted.");
}

setDeleteRequesting(false);
};

const tabs = useMemo(() => {
return [
{ k: "posts" as const, label: "Posts" },
{ k: "rides" as const, label: "Rides" },
{ k: "garage" as const, label: "Garage" },
{ k: "saved" as const, label: "Saved" },
];
}, []);

const blackcardAccessActive = hasBlackcardAccess(membership, isAdmin);

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

  <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-8 sm:px-6 lg:px-8">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <span className="text-[10px] uppercase tracking-[0.34em] text-zinc-500">Profile</span>
        <h1 className="mt-2 font-serif text-3xl leading-none text-white sm:text-4xl">
          Identity
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:max-w-[70%] sm:justify-end">
        {isAdmin && (
          <HeaderActionLink href="/admin" variant="admin">
            Admin
          </HeaderActionLink>
        )}

        <HeaderActionLink href="/blackcard" variant="premium">
          Blackcard Access
        </HeaderActionLink>

        <HeaderActionLink href="/profile/edit">Edit Identity</HeaderActionLink>

        <HeaderActionButton onClick={() => void signOut()}>Logout</HeaderActionButton>
      </div>
    </div>

    <ProfileHeader profile={profile} />

    {blackcardAccessActive && (
      <div className="mt-4 rounded-[20px] border border-[#b4141e]/25 bg-[#090909]/90 px-5 py-4 shadow-[0_0_42px_-28px_rgba(180,20,30,0.9)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.32em] text-[#e87a82]">BLACKCARD ACCESS</p>
            <h2 className="mt-1 font-serif text-xl text-white">Blackcard Member</h2>
          </div>
          <span className="text-xl text-[#b4141e]">✦</span>
        </div>
      </div>
    )}

    <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />

    {tab === "posts" && (
      <section className="mt-5">
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
      <section className="mt-5">
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

    {tab !== "posts" && tab !== "garage" && (
      <section className="mt-5">
        <EmptyPanel
          title="Coming into focus."
          body="This profile section is wired to shared state and ready for the next data layer."
        />
      </section>
    )}

    <section className="mt-6 rounded-[24px] border border-[#b4141e]/25 bg-[#b4141e]/8 p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#e87a82]">Account Safety</p>
      <h2 className="mt-2 font-serif text-2xl text-white">Delete Account Request</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Full account deletion is handled as a request during beta so shared meet, ride, and message
        history can be reviewed safely before anything destructive happens.
      </p>
      <button
        type="button"
        onClick={() => void requestAccountDeletion()}
        disabled={deleteRequesting}
        className="mt-4 rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-5 py-2.5 text-xs uppercase tracking-[0.22em] text-[#f1c3c7] transition hover:bg-[#b4141e]/25 disabled:opacity-60"
      >
        {deleteRequesting ? "Submitting" : "Request Account Deletion"}
      </button>
      {deleteRequestStatus && (
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-400">
          {deleteRequestStatus}
        </p>
      )}
    </section>

    <section className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Policies & Safety</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {policyLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-[#b4141e]/50 hover:text-[#e87a82]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  </div>

  {toast && (
    <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
      {toast}
    </div>
  )}
</main>

);
}
