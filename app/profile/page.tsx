"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

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
  isNew: boolean;
};

type MotorcycleRow = {
  id: string;
  label: string | null;
  name: string | null;
  year: string | null;
  finish: string | null;
};

type ProfileForm = {
  display_name: string;
  username: string;
  bio: string;
  location: string;
  quote: string;
  instagram_url: string;
  tiktok_url: string;
  youtube_url: string;
};

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
        <div className="h-3 w-28 rounded-full bg-white/10" />
        <div className="mx-auto h-8 w-24 rounded-full bg-white/10" />
        <div className="ml-auto flex w-[150px] flex-col gap-2">
          <div className="h-8 rounded-full bg-white/10" />
          <div className="h-8 rounded-full bg-white/10" />
          <div className="h-8 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="mt-6 rounded-[34px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4">
              <div className="h-24 w-24 rounded-full bg-white/10 md:h-28 md:w-28" />
              <div className="space-y-3 pt-1">
                <div className="h-6 w-20 rounded-full bg-white/10" />
                <div className="h-10 w-56 rounded-full bg-white/10" />
                <div className="h-4 w-48 rounded-full bg-white/10" />
                <div className="flex flex-col gap-2">
                  <div className="h-7 w-28 rounded-full bg-white/10" />
                  <div className="h-7 w-24 rounded-full bg-white/10" />
                  <div className="h-7 w-28 rounded-full bg-white/10" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 md:w-[290px]">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-[76px] rounded-[18px] border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.03] p-6">
        <div className="h-3 w-36 rounded-full bg-white/10" />
        <div className="mt-3 h-8 w-32 rounded-full bg-white/10" />
      </div>

      <div className="mt-8 flex gap-2 rounded-full border border-white/10 bg-white/[0.02] p-1">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-10 flex-1 rounded-full bg-white/10" />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="aspect-square rounded-[22px] border border-white/5 bg-white/[0.03]"
          />
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

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function withCacheBust(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
}

function SocialChip({
  href,
  label,
}: {
  href: string;
  label: "Instagram" | "TikTok" | "YouTube";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10 hover:text-[#f0c8cb]"
    >
      {label}
    </a>
  );
}

function EmptyPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/[0.025] p-10 text-center shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)]">
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

function ApexPaywall({
  onBack,
  selectedPlan,
  setSelectedPlan,
  onUnlock,
}: {
  onBack: () => void;
  selectedPlan: "monthly" | "yearly";
  setSelectedPlan: (plan: "monthly" | "yearly") => void;
  onUnlock: () => void;
}) {
  const previews = [
    "Exclusive drops",
    "Discounted merch",
    "Early access collections",
    "Member-only rides",
    "Reserved ride spots",
    "Premium profile badge",
  ];

  return (
    <section className="mt-8 overflow-hidden rounded-[32px] border border-[#b4141e]/25 bg-gradient-to-b from-[#121114] via-[#0b0b0d] to-[#060606] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.2),transparent_45%)] px-6 py-8 md:px-8 md:py-10">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
        >
          Back to Profile
        </button>

        <div className="mt-8 flex items-center justify-center gap-4">
          <span className="h-px w-10 bg-white/15" />
          <span className="text-[#b4141e]">✦</span>
          <span className="h-px w-10 bg-white/15" />
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
          Apex Members
        </p>
        <h1 className="mt-4 text-center font-serif text-5xl leading-none text-white md:text-6xl">
          Reserved for premium riders
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center font-serif text-sm leading-7 text-zinc-400">
          Entry grants earlier access, preferred placement, private privileges,
          and a quieter tier of access held beyond the public line.
        </p>
      </div>

      <div className="px-6 py-8 md:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedPlan("monthly")}
            className={`rounded-[26px] border p-6 text-left transition ${
              selectedPlan === "monthly"
                ? "border-[#b4141e]/60 bg-[#b4141e]/10 shadow-[0_0_30px_-18px_rgba(180,20,30,0.55)]"
                : "border-white/10 bg-white/[0.03] hover:border-[#b4141e]/35"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Monthly Plan
            </p>
            <h2 className="mt-3 font-serif text-4xl text-white">$24</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Flexible entry for Blackcard Access
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan("yearly")}
            className={`rounded-[26px] border p-6 text-left transition ${
              selectedPlan === "yearly"
                ? "border-[#b4141e]/60 bg-[#b4141e]/10 shadow-[0_0_30px_-18px_rgba(180,20,30,0.55)]"
                : "border-white/10 bg-white/[0.03] hover:border-[#b4141e]/35"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Yearly Plan
            </p>
            <h2 className="mt-3 font-serif text-4xl text-white">$240</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Preferred value with priority standing.
            </p>
          </button>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {previews.map((feature) => (
            <div
              key={feature}
              className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-zinc-300"
            >
              {feature}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onUnlock}
          className="mt-8 w-full rounded-full bg-[#b4141e]/80 px-5 py-3 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-[#b4141e]"
        >
          Continue with {selectedPlan === "monthly" ? "Monthly" : "Yearly"}
        </button>
      </div>
    </section>
  );
}

function ApexDashboard({ onBack }: { onBack: () => void }) {
  const sections = [
    "Exclusive drops",
    "Discounted merch",
    "Early access collections",
    "Member-only rides",
    "Reserved ride spots",
    "Future loyalty rewards",
    "Future private chats",
    "Premium profile badge",
  ];

  return (
    <section className="mt-8 overflow-hidden rounded-[32px] border border-[#b4141e]/20 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#060606] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
      <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.18),transparent_45%)] px-6 py-8 md:px-8 md:py-10">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
        >
          Back to Profile
        </button>

        <p className="mt-8 text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
          Apex Members
        </p>
        <h1 className="mt-4 font-serif text-5xl leading-none text-white md:text-6xl">
          Blackcard Access Granted
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">
          A private tier of access reserved for members with first claim on
          releases, protected ride placement, and future privileges kept beyond
          the public floor.
        </p>
      </div>

      <div className="grid gap-4 px-6 py-8 md:grid-cols-2 md:px-8 xl:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section}
            className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Apex
            </p>
            <h2 className="mt-3 font-serif text-2xl text-white">{section}</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              Placeholder for premium access, upcoming releases, and member-only
              experiences.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const { session, loading: authLoading, profile, status, isAdmin } = useAuth();

  const [tab, setTab] = useState<"posts" | "rides" | "garage" | "saved">(
    "posts"
  );
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [profileView, setProfileView] = useState<
    "profile" | "apex-paywall" | "apex-dashboard"
  >("profile");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">(
    "yearly"
  );

  const [form, setForm] = useState<ProfileForm>({
    display_name: "Hector Buentello",
    username: "hbuentello",
    bio: "Motorcycles, midnight city runs, and the discipline that keeps the machine sharp.",
    location: "Houston, TX",
    quote: "Bound by the road. Kept by the code.",
    instagram_url: "",
    tiktok_url: "",
    youtube_url: "",
  });

  const stats = useMemo(
    () => [
      { n: "62", label: "Rides" },
      { n: "148", label: "Connections" },
      { n: String(posts.length), label: "Posts" },
    ],
    [posts.length]
  );

  const tabs = [
    { k: "posts", label: "Posts" },
    { k: "rides", label: "Rides" },
    { k: "garage", label: "Garage" },
    { k: "saved", label: "Saved" },
  ] as const;

  const displayName = form.display_name.trim() || "Unnamed Member";
  const displayUsername = form.username.trim()
    ? `@${form.username.trim().replace(/^@+/, "")}`
    : "@member";
  const displayLocation = form.location.trim() || "Location pending";

  const instagramUrl = normalizeUrl(form.instagram_url);
  const tiktokUrl = normalizeUrl(form.tiktok_url);
  const youtubeUrl = normalizeUrl(form.youtube_url);

  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        display_name: profile.display_name ?? prev.display_name,
        username: profile.username ?? prev.username,
        bio: (profile as any).bio ?? prev.bio,
        location: (profile as any).location ?? prev.location,
        quote: (profile as any).quote ?? prev.quote,
        instagram_url: (profile as any).instagram_url ?? "",
        tiktok_url: (profile as any).tiktok_url ?? "",
        youtube_url: (profile as any).youtube_url ?? "",
      }));

      if (profile.profile_image_url) {
        setProfileImageUrl(withCacheBust(profile.profile_image_url));
      } else {
        setProfileImageUrl("");
      }
    }
  }, [profile]);

  useEffect(() => {
    async function loadProfilePage() {
      if (authLoading) return;

      setLoading(true);
      setErrorMsg("");

      if (!session?.user) {
        setErrorMsg("You need to be logged in.");
        setLoading(false);
        return;
      }

      if (!profile) {
        setErrorMsg("Your profile could not be loaded.");
        setLoading(false);
        return;
      }

      if (status === "suspended" || status === "blocked") {
        setLoading(false);
        return;
      }

      const motorcyclesResponse = await supabase
        .from("motorcycles")
        .select("id, label, name, year, finish")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });

      const motorcycleData = (motorcyclesResponse.data ?? []) as MotorcycleRow[];

      if (!motorcyclesResponse.error && motorcycleData.length > 0) {
        setMotorcycles(
          motorcycleData.map((bike) => ({
            id: bike.id,
            label: bike.label ?? "Garage One",
            name: bike.name ?? "",
            year: bike.year ?? "",
            finish: bike.finish ?? "",
            isNew: false,
          }))
        );
      } else {
        setMotorcycles([
          {
            id: crypto.randomUUID(),
            label: "Garage One",
            name: "Ducati Panigale V4",
            year: "2023",
            finish: "Crimson over Carbon",
            isNew: true,
          },
        ]);
      }

      const postsResponse = await supabase
        .from("Posts")
        .select("id, user_id, image_url, caption, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (postsResponse.error) {
        setErrorMsg("Could not load your posts.");
        setLoading(false);
        return;
      }

      setPosts((postsResponse.data as ProfilePost[]) || []);
      setLoading(false);
    }

    void loadProfilePage();
  }, [authLoading, session, profile, status]);

  async function handleShareProfile() {
    const shareUrl =
      typeof window !== "undefined" ? window.location.href : "/profile";

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        session?.user
      ) {
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

  if (authLoading || loading) {
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
        <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-10 sm:px-6 lg:px-8">
          <ProfileSkeleton />
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

  if (profileView === "apex-paywall") {
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
          <ApexPaywall
            onBack={() => setProfileView("profile")}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            onUnlock={() => {
              setIsPremium(true);
              setProfileView("apex-dashboard");
            }}
          />
        </div>
      </main>
    );
  }

  if (profileView === "apex-dashboard") {
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
        <div className="relative mx-auto max-w-5xl px-6 pb-28 pt-12">
          <ApexDashboard onBack={() => setProfileView("profile")} />
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

      <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
          <div className="flex items-center">
            <span className="text-[11px] uppercase tracking-[0.38em] text-zinc-500">
              Your Profile
            </span>
          </div>

          <div className="flex justify-center">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[#e87a82] transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/15"
              >
                Admin
              </Link>
            )}
          </div>

          <div className="flex justify-end">
            <div className="flex w-[150px] flex-col items-stretch gap-2">
              <Link
                href="/profile/edit"
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-200 transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/10 hover:text-[#f0c8cb]"
              >
                Edit Profile
              </Link>

              <button
                type="button"
                onClick={handleShareProfile}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/25 hover:text-white"
              >
                Share Profile
              </button>

              <button
                type="button"
                onClick={() =>
                  setProfileView(isPremium ? "apex-dashboard" : "apex-paywall")
                }
                className="rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 px-3.5 py-1.5 text-center text-[10px] uppercase tracking-[0.2em] text-[#f1c3c7] transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/15"
              >
                Blackcard Access
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(180,20,30,0.12),transparent_30%)]" />
          <div className="relative px-6 py-6 md:px-8 md:py-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4 md:gap-5">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-[#b4141e]/60 shadow-[0_0_40px_-6px_rgba(180,20,30,0.65)] md:h-28 md:w-28">
                    {profileImageUrl ? (
                      <img
                        key={profileImageUrl}
                        src={profileImageUrl}
                        alt={`${displayName} profile picture`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                        No Photo
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 pt-1">
                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.24em] text-zinc-400">
                      Member
                    </span>

                    <h1 className="mt-3 font-serif text-[34px] leading-none text-white sm:text-[40px]">
                      {displayName}
                    </h1>

                    <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                      {displayUsername} · {displayLocation}
                    </p>

                    <div className="mt-4 flex flex-col items-start gap-2">
                      {instagramUrl && (
                        <SocialChip href={instagramUrl} label="Instagram" />
                      )}
                      {tiktokUrl && (
                        <SocialChip href={tiktokUrl} label="TikTok" />
                      )}
                      {youtubeUrl && (
                        <SocialChip href={youtubeUrl} label="YouTube" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:w-[290px]">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[18px] border border-white/10 bg-black/20 px-3 py-3 text-center backdrop-blur-sm"
                    >
                      <p className="font-serif text-[28px] leading-none text-white">
                        {stat.n}
                      </p>
                      <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-[26px] border border-[#b4141e]/20 bg-gradient-to-b from-[#121114] via-[#0c0c0d] to-[#070707] shadow-[0_24px_80px_-40px_rgba(0,0,0,0.95)]">
          <div className="px-6 py-5 md:px-7">
            <p className="text-[10px] uppercase tracking-[0.34em] text-[#e87a82]">
              BLACKCARD ACCESS
            </p>
            <h2 className="mt-2 font-serif text-2xl text-white">
              Apex Member
            </h2>
          </div>
        </section>

        <div className="mt-8 flex gap-2 rounded-full border border-white/10 bg-white/[0.02] p-1">
          {tabs.map((item) => (
            <button
              key={item.k}
              onClick={() => setTab(item.k)}
              className={`flex-1 rounded-full py-2.5 text-xs uppercase tracking-[0.3em] transition ${
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
            {!errorMsg && posts.length === 0 && (
              <EmptyPanel
                title="No posts yet."
                body="Your grid becomes the visual archive of your ride life."
              />
            )}

            {!errorMsg && posts.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="group relative aspect-square overflow-hidden rounded-[22px] border border-white/5 bg-white/[0.02]"
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
                      <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs uppercase tracking-[0.25em] text-zinc-400">
                        {post.caption || "No image available"}
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 opacity-0 transition duration-300 group-hover:opacity-100">
                      <p className="line-clamp-2 text-xs uppercase tracking-[0.18em] text-zinc-200">
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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {motorcycles.map((bike) => (
                <article
                  key={bike.id}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0f0f10] to-[#070707] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)]"
                >
                  <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.14),transparent_48%)] px-5 py-5">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                      {bike.label}
                    </p>
                    <h3 className="mt-3 font-serif text-3xl leading-none text-white">
                      {bike.name || "Unnamed Motorcycle"}
                    </h3>
                    <p className="mt-3 text-sm text-zinc-400">
                      {bike.year || "Year pending"} · {bike.finish || "Finish pending"}
                    </p>
                  </div>

                  <div className="px-5 py-5">
                    <div className="flex items-center gap-4">
                      <span className="h-px w-10 bg-white/15" />
                      <span className="text-[#b4141e]">✦</span>
                      <span className="h-px w-10 bg-white/15" />
                    </div>

                    <p className="mt-5 text-sm leading-7 text-zinc-500">
                      Every machine in the garage becomes part of the member
                      story.
                    </p>
                  </div>
                </article>
              ))}
            </div>
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
      </div>
    </main>
  );
}