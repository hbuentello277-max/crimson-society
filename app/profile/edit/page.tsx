"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { cleanUsername } from "@/lib/profile";

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
  website_url: string;
};

function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Upload timed out. Please try again."));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function withCacheBust(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function ProfileEditSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-40 rounded-full bg-white/10" />
        <div className="h-10 w-28 rounded-full bg-white/10" />
      </div>

      <div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="h-28 w-28 rounded-full bg-white/10" />
          <div className="space-y-4">
            <div className="h-10 w-56 rounded-full bg-white/10" />
            <div className="h-4 w-64 rounded-full bg-white/10" />
            <div className="h-10 w-40 rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <div className="h-3 w-36 rounded-full bg-white/10" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="h-12 rounded-xl bg-white/10" />
          <div className="h-12 rounded-xl bg-white/10" />
          <div className="h-28 rounded-2xl bg-white/10 md:col-span-2" />
          <div className="h-12 rounded-xl bg-white/10" />
          <div className="h-12 rounded-xl bg-white/10" />
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <div className="h-3 w-36 rounded-full bg-white/10" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="h-12 rounded-xl bg-white/10" />
          <div className="h-12 rounded-xl bg-white/10" />
          <div className="h-12 rounded-xl bg-white/10 md:col-span-2" />
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <div className="h-3 w-24 rounded-full bg-white/10" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="h-48 rounded-[26px] bg-white/10" />
          <div className="h-48 rounded-[26px] bg-white/10" />
        </div>
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
        href="/profile"
        className="mt-8 rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
      >
        Back to Profile
      </Link>
    </div>
  );
}

function SocialPreviewChip({
  href,
  label,
}: {
  href: string;
  label: "Instagram" | "TikTok" | "YouTube" | "Website";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
    >
      {label}
    </a>
  );
}

export default function ProfileEditPage() {
  const { session, loading: authLoading, profile, status, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGarage, setSavingGarage] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [garageMsg, setGarageMsg] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);

  const userId = session?.user?.id ?? null;

  const [form, setForm] = useState<ProfileForm>({
    display_name: "",
    username: "",
    bio: "",
    location: "",
    quote: "",
    instagram_url: "",
    tiktok_url: "",
    youtube_url: "",
    website_url: "",
  });

  const displayName = form.display_name.trim() || "Unnamed Member";
  const displayUsername = form.username.trim()
    ? `@${form.username.trim().replace(/^@+/, "")}`
    : "@member";
  const displayLocation = form.location.trim() || "Location pending";

  const instagramUrl = normalizeUrl(form.instagram_url);
  const tiktokUrl = normalizeUrl(form.tiktok_url);
  const youtubeUrl = normalizeUrl(form.youtube_url);
  const websiteUrl = normalizeUrl(form.website_url);

  const garageCountLabel = useMemo(() => {
    if (motorcycles.length === 0) return "No motorcycles loaded";
    if (motorcycles.length === 1) return "1 motorcycle";
    return `${motorcycles.length} motorcycles`;
  }, [motorcycles.length]);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        quote: profile.quote ?? "",
        instagram_url: profile.instagram_url ?? "",
        tiktok_url: profile.tiktok_url ?? "",
        youtube_url: profile.youtube_url ?? "",
        website_url: profile.website_url ?? "",
      });
      setProfileImageUrl(
        profile.profile_image_url ? withCacheBust(profile.profile_image_url) : ""
      );
    }
  }, [profile]);

  useEffect(() => {
    async function loadEditPage() {
      if (authLoading) return;

      setLoading(true);
      setErrorMsg("");
      setProfileMsg("");
      setGarageMsg("");

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
            name: "",
            year: "",
            finish: "",
            isNew: true,
          },
        ]);
      }

      setLoading(false);
    }

    void loadEditPage();
  }, [authLoading, session, profile, status]);

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

    if (!bikeToDelete || bikeToDelete.isNew || !userId) return;

    await supabase.from("motorcycles").delete().eq("id", id).eq("user_id", userId);
  }

  async function saveGarage() {
    setSavingGarage(true);
    setGarageMsg("");

    if (!userId) {
      setGarageMsg("You need to be logged in to save.");
      setSavingGarage(false);
      return;
    }

    const payload = motorcycles.map((bike) => ({
      id: bike.id,
      user_id: userId,
      label: bike.label.trim(),
      name: bike.name.trim(),
      year: bike.year.trim(),
      finish: bike.finish.trim(),
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

    if (!userId) {
      setProfileMsg("You need to be logged in to save.");
      setSavingProfile(false);
      return;
    }

    const payload = {
      display_name: form.display_name.trim(),
      username: cleanUsername(form.username),
      bio: form.bio.trim(),
      location: form.location.trim(),
      quote: form.quote.trim(),
      instagram_url: normalizeUrl(form.instagram_url),
      tiktok_url: normalizeUrl(form.tiktok_url),
      youtube_url: normalizeUrl(form.youtube_url),
      website_url: normalizeUrl(form.website_url),
    };

    const response = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select(
        "display_name, username, bio, location, quote, instagram_url, tiktok_url, youtube_url, website_url, profile_image_url"
      )
      .maybeSingle();

    if (response.error) {
      setProfileMsg(response.error.message);
      setSavingProfile(false);
      return;
    }

    if (!response.data) {
      setProfileMsg("No profile row was updated. Please refresh and try again.");
      setSavingProfile(false);
      return;
    }

    setForm({
      display_name: response.data.display_name ?? "",
      username: response.data.username ?? "",
      bio: response.data.bio ?? "",
      location: response.data.location ?? "",
      quote: response.data.quote ?? "",
      instagram_url: response.data.instagram_url ?? "",
      tiktok_url: response.data.tiktok_url ?? "",
      youtube_url: response.data.youtube_url ?? "",
      website_url: response.data.website_url ?? "",
    });
    setProfileImageUrl(
      response.data.profile_image_url ? withCacheBust(response.data.profile_image_url) : ""
    );
    await refreshProfile();
    setProfileMsg("Profile details saved.");
    setSavingProfile(false);
  }

  async function handleProfileImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!userId) {
      setProfileMsg("You need to be logged in to upload an image.");
      e.target.value = "";
      return;
    }

    setUploadingImage(true);
    setProfileMsg("Uploading photo...");
    setErrorMsg("");

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file.");
      }

      if (file.size > 6 * 1024 * 1024) {
        throw new Error("Image must be under 6MB.");
      }

      const filePath = `${userId}/avatar.jpg`;

      const { error: uploadError } = await withTimeout(
        supabase.storage.from("avatars").upload(filePath, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
          cacheControl: "0",
        }),
        15000
      );

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

      const { error: profileUpdateError } = await withTimeout(
        Promise.resolve(
          supabase
            .from("profiles")
            .update({ profile_image_url: rawImageUrl })
            .eq("id", userId)
        ),
        10000
      );

      if (profileUpdateError) {
        throw new Error(`Profile update failed: ${profileUpdateError.message}`);
      }

      setProfileImageUrl(withCacheBust(rawImageUrl));
      await refreshProfile();
      setProfileMsg("Profile photo updated.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong uploading the image.";

      console.error("PROFILE IMAGE UPLOAD ERROR:", error);
      setProfileMsg(message);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
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
        <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-6 lg:px-8">
          <ProfileEditSkeleton />
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

      <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.38em] text-zinc-500">
              Profile Settings
            </p>
            <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">
              Edit Profile
            </h1>
          </div>

          <Link
            href="/profile"
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]"
          >
            Back to Profile
          </Link>
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)]">
          <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.22),transparent_45%)] px-6 py-8 md:px-8 md:py-9">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-[#b4141e]/60 shadow-[0_0_40px_-6px_rgba(180,20,30,0.7)] md:h-32 md:w-32">
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

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <h2 className="font-serif text-3xl text-white md:text-4xl">
                    {displayName}
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                    {displayUsername}
                  </span>
                </div>

                <p className="mt-3 text-sm text-zinc-400">{displayLocation}</p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]">
                    {uploadingImage ? "Uploading..." : "Change Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>

                  <Link
                    href="/profile"
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/25 hover:text-white"
                  >
                    View Public Profile
                  </Link>
                </div>

                {profileMsg && (
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-400">
                    {profileMsg}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                Profile
              </p>
              <h2 className="mt-2 font-serif text-3xl text-white">
                Craft your Profile
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
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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

            <div>
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

            <div>
              <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                Website URL
              </label>
              <input
                type="url"
                value={form.website_url}
                onChange={(e) => updateFormField("website_url", e.target.value)}
                placeholder="https://your-site.com"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
              />
            </div>
          </div>

          {(instagramUrl || tiktokUrl || youtubeUrl || websiteUrl) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {instagramUrl && (
                <SocialPreviewChip href={instagramUrl} label="Instagram" />
              )}
              {tiktokUrl && (
                <SocialPreviewChip href={tiktokUrl} label="TikTok" />
              )}
              {youtubeUrl && (
                <SocialPreviewChip href={youtubeUrl} label="YouTube" />
              )}
              {websiteUrl && (
                <SocialPreviewChip href={websiteUrl} label="Website" />
              )}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">
                Garage
              </p>
              <h2 className="mt-2 font-serif text-3xl text-white">
                Motorcycles
              </h2>
              <p className="mt-3 text-sm text-zinc-500">{garageCountLabel}</p>
            </div>

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
            </div>
          </div>

          {garageMsg && (
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-400">
              {garageMsg}
            </p>
          )}

          <div className="mt-6 space-y-4">
            {motorcycles.map((bike, index) => (
              <div
                key={bike.id}
                className="grid gap-4 overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-[#0d0d0e] to-[#070707] p-5 md:grid-cols-2"
              >
                <div className="rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(180,20,30,0.14),transparent_46%)] p-5">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">
                    {bike.label || `Garage ${index + 1}`}
                  </p>

                  <h3 className="mt-3 font-serif text-3xl leading-none text-white">
                    {bike.name || "Unnamed Motorcycle"}
                  </h3>

                  <p className="mt-3 text-sm text-zinc-400">
                    {bike.year || "Year pending"} · {bike.finish || "Finish pending"}
                  </p>

                  <div className="mt-6 flex items-center gap-4">
                    <span className="h-px w-10 bg-white/15" />
                    <span className="text-[#b4141e]">✦</span>
                    <span className="h-px w-10 bg-white/15" />
                  </div>

                  <p className="mt-5 text-sm leading-7 text-zinc-500">
                    Every machine in the garage becomes part of the member story.
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">
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
          </div>
        </section>
      </div>
    </main>
  );
}
