"use client";

import Link from "next/link";
import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfilePost = {
  id: string;
  user_id: string;
  image_url: string | null;
  caption: string | null;
  created_at: string | null;
};

type ProfileRow = {
  profile_image_url?: string | null;
  role?: string | null;
  status?: string | null;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  location?: string | null;
  quote?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
} | null;

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
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 rounded-full bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="h-9 w-20 rounded-full bg-white/10" />
          <div className="h-9 w-20 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col items-center text-center">
          <div className="h-32 w-32 rounded-full bg-white/10" />
          <div className="mt-5 h-10 w-52 rounded-full bg-white/10" />
          <div className="mt-3 h-4 w-64 rounded-full bg-white/10" />
          <div className="mt-6 h-14 w-80 rounded-2xl bg-white/10" />
          <div className="mt-4 h-16 w-full max-w-xl rounded-2xl bg-white/10" />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-[120px] rounded-2xl border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="h-3 w-32 rounded-full bg-white/10" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-24 rounded-2xl bg-white/10 md:col-span-2" />
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10" />
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <div className="h-3 w-32 rounded-full bg-white/10" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10" />
            <div className="h-12 rounded-xl bg-white/10 md:col-span-2" />
          </div>
        </div>
      </div>

      <div className="mt-8 flex gap-2 rounded-full border border-white/10 bg-white/[0.02] p-1">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-10 flex-1 rounded-full bg-white/10" />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            className="aspect-square rounded-xl border border-white/5 bg-white/[0.03]"
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
      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
    >
      {label}
    </a>
  );
}

export default function ProfilePage() {
  const [tab, setTab] = useState<"posts" | "rides" | "saved">("posts");
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [savingGarage, setSavingGarage] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [garageMsg, setGarageMsg] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState("");

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
    { k: "saved", label: "Saved" },
  ] as const;

  const displayName = form.display_name.trim() || "Unnamed Member";
  const displayUsername = form.username.trim()
    ? `@${form.username.trim().replace(/^@+/, "")}`
    : "@member";
  const displayLocation = form.location.trim() || "Location pending";
  const displayQuote = form.quote.trim() || "Build your identity.";
  const displayBio =
    form.bio.trim() ||
    "Add a short bio to tell the Society what drives you.";

  const instagramUrl = normalizeUrl(form.instagram_url);
  const tiktokUrl = normalizeUrl(form.tiktok_url);
  const youtubeUrl = normalizeUrl(form.youtube_url);

  useEffect(() => {
    async function loadProfilePage() {
      setLoading(true);
      setErrorMsg("");
      setGarageMsg("");
      setProfileMsg("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg("You need to be logged in.");
        setLoading(false);
        return;
      }

      const profileResponse = await supabase
        .from("profiles")
        .select(
          "profile_image_url, role, status, display_name, username, bio, location, quote, instagram_url, tiktok_url, youtube_url"
        )
        .eq("id", user.id)
        .maybeSingle();

      const profileData = profileResponse.data as ProfileRow;
      const profileError = profileResponse.error;

      if (profileError) {
        setErrorMsg(profileError.message);
        setLoading(false);
        return;
      }

      if (!profileData) {
        setErrorMsg("Your profile could not be loaded.");
        setLoading(false);
        return;
      }

      setProfileRole(profileData.role ?? null);
      setProfileStatus(profileData.status ?? null);

      if (profileData.profile_image_url) {
        setProfileImageUrl(withCacheBust(profileData.profile_image_url));
      }

      setForm((prev) => ({
        ...prev,
        display_name: profileData.display_name ?? prev.display_name,
        username: profileData.username ?? prev.username,
        bio: profileData.bio ?? prev.bio,
        location: profileData.location ?? prev.location,
        quote: profileData.quote ?? prev.quote,
        instagram_url: profileData.instagram_url ?? "",
        tiktok_url: profileData.tiktok_url ?? "",
        youtube_url: profileData.youtube_url ?? "",
      }));

      if (profileData.status === "suspended" || profileData.status === "blocked") {
        setLoading(false);
        return;
      }

      const motorcyclesResponse = await supabase
        .from("motorcycles")
        .select("id, label, name, year, finish")
        .eq("user_id", user.id)
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
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (postsResponse.error) {
        setErrorMsg("Could not load your posts.");
        setLoading(false);
        return;
      }

      setPosts((postsResponse.data as ProfilePost[]) || []);
      setLoading(false);
    }

    loadProfilePage();
  }, []);

  function updateFormField(field: keyof ProfileForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateMotorcycle(
    id: string,
    field: keyof Omit<Motorcycle, "id" | "isNew">,
    value: string
  ) {
    setMotorcycles((prev) =>
      prev.map((bike) => (bike.id === id ? { ...bike, [field]: value } : bike))
    );
  }

  function addMotorcycle() {
    setMotorcycles((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: `Garage ${prev.length + 1}`,
        name: "",
        year: "",
        finish: "",
        isNew: true,
      },
    ]);
  }

  async function deleteMotorcycle(id: string) {
    const bikeToDelete = motorcycles.find((bike) => bike.id === id);

    setMotorcycles((prev) => prev.filter((bike) => bike.id !== id));

    if (!bikeToDelete || bikeToDelete.isNew) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase.from("motorcycles").delete().eq("id", id).eq("user_id", user.id);
  }

  async function saveGarage() {
    setSavingGarage(true);
    setGarageMsg("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setGarageMsg("You need to be logged in to save.");
      setSavingGarage(false);
      return;
    }

    const payload = motorcycles.map((bike) => ({
      id: bike.id,
      user_id: user.id,
      label: bike.label,
      name: bike.name,
      year: bike.year,
      finish: bike.finish,
    }));

    const response = await supabase
      .from("motorcycles")
      .upsert(payload, { onConflict: "id" });

    if (response.error) {
      setGarageMsg("Could not save garage.");
      setSavingGarage(false);
      return;
    }

    setMotorcycles((prev) => prev.map((bike) => ({ ...bike, isNew: false })));
    setGarageMsg("Garage saved.");
    setSavingGarage(false);
  }

  async function saveProfileDetails() {
    setSavingProfile(true);
    setProfileMsg("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setProfileMsg("You need to be logged in to save.");
      setSavingProfile(false);
      return;
    }

    const payload = {
      display_name: form.display_name.trim(),
      username: form.username.trim().replace(/^@+/, ""),
      bio: form.bio.trim(),
      location: form.location.trim(),
      quote: form.quote.trim(),
      instagram_url: form.instagram_url.trim(),
      tiktok_url: form.tiktok_url.trim(),
      youtube_url: form.youtube_url.trim(),
    };

    const response = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (response.error) {
      setProfileMsg(response.error.message);
      setSavingProfile(false);
      return;
    }

    setProfileMsg("Profile details saved.");
    setSavingProfile(false);
  }

  async function handleProfileImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setGarageMsg("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You need to be logged in to upload an image.");
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const rawImageUrl = publicUrlData.publicUrl;

      if (!rawImageUrl) {
        throw new Error("Could not generate a public URL for the uploaded image.");
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          profile_image_url: rawImageUrl,
        })
        .eq("id", user.id);

      if (profileUpdateError) {
        throw new Error(`Profile update failed: ${profileUpdateError.message}`);
      }

      setProfileImageUrl(withCacheBust(rawImageUrl));
      setGarageMsg("Profile image updated.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong uploading the image.";

      console.error("PROFILE IMAGE UPLOAD ERROR:", error);
      setGarageMsg(message);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
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

      <div className="relative mx-auto max-w-4xl px-6 pt-12 pb-28">
        {loading ? (
          <ProfileSkeleton />
        ) : profileStatus === "suspended" || profileStatus === "blocked" ? (
          <RestrictedAccountScreen status={profileStatus} />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.4em] text-zinc-500">
                Your Profile
              </span>

              <div className="flex items-center gap-3">
                {profileRole === "admin" && profileStatus === "active" && (
                  <Link
                    href="/admin"
                    className="rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[#e87a82] transition hover:border-[#b4141e]/60 hover:bg-[#b4141e]/15"
                  >
                    Admin
                  </Link>
                )}

                <a
                  href="#identity-editor"
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
                >
                  Edit Identity
                </a>
              </div>
            </div>

            <section className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707]">
              <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.22),transparent_45%)] px-6 py-8 md:px-8 md:py-10">
                <div className="flex flex-col items-center text-center">
                  <div className="relative h-32 w-32 overflow-hidden rounded-full border border-[#b4141e]/60 shadow-[0_0_40px_-6px_rgba(180,20,30,0.7)]">
                    {profileImageUrl ? (
                      <img
                        src={profileImageUrl}
                        alt={`${displayName} profile picture`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-xs uppercase tracking-[0.2em] text-zinc-400">
                        No Photo
                      </div>
                    )}
                  </div>

                  <label className="mt-4 cursor-pointer rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]">
                    {uploadingImage ? "Uploading..." : "Change Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                    />
                  </label>

                  <h1 className="mt-5 font-serif text-5xl leading-none text-white">
                    {displayName}
                  </h1>

                  <p className="mt-2 text-sm uppercase tracking-[0.3em] text-zinc-500">
                    {displayUsername} · {displayLocation}
                  </p>

                  <div className="mt-6 flex items-center gap-4">
                    <span className="h-px w-12 bg-white/20" />
                    <span className="text-[#b4141e]">✦</span>
                    <span className="h-px w-12 bg-white/20" />
                  </div>

                  <p className="mt-5 max-w-xl font-serif text-xl italic text-zinc-300">
                    “{displayQuote}”
                  </p>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">
                    {displayBio}
                  </p>

                  {(instagramUrl || tiktokUrl || youtubeUrl) && (
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      {instagramUrl && <SocialChip href={instagramUrl} label="Instagram" />}
                      {tiktokUrl && <SocialChip href={tiktokUrl} label="TikTok" />}
                      {youtubeUrl && <SocialChip href={youtubeUrl} label="YouTube" />}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 px-6 py-6 md:px-8">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex h-[120px] items-center justify-center rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm"
                  >
                    <div className="flex flex-col items-center justify-center text-center">
                      <p className="font-serif text-4xl leading-none text-white">
                        {stat.n}
                      </p>
                      <p className="mt-3 text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="identity-editor"
              className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                    Identity
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-white">
                    Refine your presence
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={saveProfileDetails}
                  disabled={savingProfile}
                  className="rounded-full bg-[#b4141e]/80 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-[#b4141e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save Identity"}
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) => updateFormField("display_name", e.target.value)}
                    placeholder="Display name"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    Username
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => updateFormField("username", e.target.value)}
                    placeholder="username"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => updateFormField("bio", e.target.value)}
                    placeholder="Tell the Society what drives you."
                    rows={4}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    Location
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => updateFormField("location", e.target.value)}
                    placeholder="City, State"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    Quote
                  </label>
                  <input
                    type="text"
                    value={form.quote}
                    onChange={(e) => updateFormField("quote", e.target.value)}
                    placeholder="A line that defines you"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                </div>
              </div>

              {profileMsg && (
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-400">
                  {profileMsg}
                </p>
              )}
            </section>

            <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                    Social Links
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-white">
                    Connect your channels
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={saveProfileDetails}
                  disabled={savingProfile}
                  className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save Links"}
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={form.instagram_url}
                    onChange={(e) => updateFormField("instagram_url", e.target.value)}
                    placeholder="https://instagram.com/yourname"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    TikTok URL
                  </label>
                  <input
                    type="url"
                    value={form.tiktok_url}
                    onChange={(e) => updateFormField("tiktok_url", e.target.value)}
                    placeholder="https://tiktok.com/@yourname"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={form.youtube_url}
                    onChange={(e) => updateFormField("youtube_url", e.target.value)}
                    placeholder="https://youtube.com/@yourchannel"
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                </div>
              </div>

              {(instagramUrl || tiktokUrl || youtubeUrl) && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {instagramUrl && <SocialChip href={instagramUrl} label="Instagram" />}
                  {tiktokUrl && <SocialChip href={tiktokUrl} label="TikTok" />}
                  {youtubeUrl && <SocialChip href={youtubeUrl} label="YouTube" />}
                </div>
              )}
            </section>

            <section className="mt-6 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                    Garage
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-white">
                    Curate your machines
                  </h2>
                </div>
              </div>

              {motorcycles.map((bike, index) => (
                <div key={bike.id} className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-6">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                      {bike.label}
                    </p>
                    <p className="mt-3 font-serif text-3xl text-white">
                      {bike.name || "Unnamed Motorcycle"}
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">
                      {bike.year || "Year pending"} · {bike.finish || "Finish pending"}
                    </p>

                    <div className="mt-6 flex items-center gap-4">
                      <span className="h-px w-12 bg-white/15" />
                      <span className="text-[#b4141e]">✦</span>
                      <span className="h-px w-12 bg-white/15" />
                    </div>

                    <p className="mt-5 text-sm leading-7 text-zinc-500">
                      Every machine in the garage becomes part of the member story.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                        Edit Motorcycle {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => deleteMotorcycle(bike.id)}
                        className="text-[10px] uppercase tracking-[0.25em] text-red-300 transition hover:text-red-200"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      <input
                        type="text"
                        value={bike.label}
                        onChange={(e) =>
                          updateMotorcycle(bike.id, "label", e.target.value)
                        }
                        placeholder="Label"
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                      />

                      <input
                        type="text"
                        value={bike.name}
                        onChange={(e) =>
                          updateMotorcycle(bike.id, "name", e.target.value)
                        }
                        placeholder="Motorcycle name"
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                      />

                      <input
                        type="text"
                        value={bike.year}
                        onChange={(e) =>
                          updateMotorcycle(bike.id, "year", e.target.value)
                        }
                        placeholder="Year"
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                      />

                      <input
                        type="text"
                        value={bike.finish}
                        onChange={(e) =>
                          updateMotorcycle(bike.id, "finish", e.target.value)
                        }
                        placeholder="Finish / color"
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={addMotorcycle}
                  className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
                >
                  Add Motorcycle
                </button>

                <button
                  type="button"
                  onClick={saveGarage}
                  disabled={savingGarage}
                  className="rounded-full bg-[#b4141e]/80 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-[#b4141e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingGarage ? "Saving..." : "Save Garage"}
                </button>

                {garageMsg && (
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                    {garageMsg}
                  </p>
                )}
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
                {errorMsg && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
                    <p className="text-sm text-red-300">{errorMsg}</p>
                  </div>
                )}

                {!errorMsg && posts.length === 0 && (
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-10 text-center">
                    <p className="font-serif text-2xl italic text-zinc-400">
                      No posts yet.
                    </p>
                    <p className="mt-3 text-sm text-zinc-500">
                      Your grid becomes the visual archive of your ride life.
                    </p>
                  </div>
                )}

                {!errorMsg && posts.length > 0 && (
                  <div className="mx-auto grid max-w-[950px] grid-cols-3 gap-4">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]"
                      >
                        {post.image_url ? (
                          <Image
                            src={post.image_url}
                            alt={post.caption || "Crimson Society post"}
                            fill
                            sizes="(max-width: 768px) 33vw, 220px"
                            className="object-cover transition duration-300 hover:scale-105"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs uppercase tracking-[0.25em] text-zinc-400">
                            {post.caption || "No image available"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {tab === "rides" && (
              <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.02] p-10 text-center">
                <p className="font-serif text-2xl italic text-zinc-400">
                  Your ride history will live here.
                </p>
                <p className="mt-3 text-sm text-zinc-500">
                  Past routes, late-night runs, and future mileage belong in this archive.
                </p>
              </div>
            )}

            {tab === "saved" && (
              <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.02] p-10 text-center">
                <p className="font-serif text-2xl italic text-zinc-400">
                  Posts you&apos;ve saved appear here.
                </p>
                <p className="mt-3 text-sm text-zinc-500">
                  Keep references, builds, and visuals that inspire your next move.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}