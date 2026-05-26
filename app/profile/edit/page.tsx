"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import EditProfileForm from "@/components/profile/EditProfileForm";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import {
  getProfileSaveErrorDetails,
  profileDisplayName,
  profileHandle,
  profileLocation,
  type ProfileIdentityInput,
  type ProfileSaveErrorDetails,
} from "@/lib/profile";
import { supabase } from "@/lib/supabase";

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

function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Upload timed out. Please try again.")), ms);
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

export default function ProfileEditPage() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error, updateIdentity, updateAvatar, refresh } = useProfile();
  const userId = session?.user?.id ?? null;
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGarage, setSavingGarage] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileSaveError, setProfileSaveError] = useState<ProfileSaveErrorDetails | null>(null);
  const [garageMsg, setGarageMsg] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);

  useEffect(() => {
    if (authLoading || !userId) return;

    const loadGarage = async () => {
      const { data } = await supabase
        .from("motorcycles")
        .select("id, label, name, year, finish")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      const rows = (data ?? []) as MotorcycleRow[];
      setMotorcycles(
        rows.length > 0
          ? rows.map((bike) => ({
              id: bike.id,
              label: bike.label ?? "Garage One",
              name: bike.name ?? "",
              year: bike.year ?? "",
              finish: bike.finish ?? "",
              isNew: false,
            }))
          : [
              {
                id: crypto.randomUUID(),
                label: "Garage One",
                name: "",
                year: "",
                finish: "",
                isNew: true,
              },
            ],
      );
    };

    void loadGarage();
  }, [authLoading, userId]);

  function updateMotorcycle(
    id: string,
    field: keyof Omit<Motorcycle, "id" | "isNew">,
    value: string,
  ) {
    setMotorcycles((prev) =>
      prev.map((bike) => (bike.id === id ? { ...bike, [field]: value } : bike)),
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

  async function saveProfileDetails(values: ProfileIdentityInput) {
    setSavingProfile(true);
    setProfileMsg("");
    setProfileSaveError(null);

    try {
      await updateIdentity(values);
      setProfileMsg("Profile details saved to Supabase.");
    } catch (saveError) {
      const details = getProfileSaveErrorDetails(saveError);
      setProfileSaveError(details);
      setProfileMsg(`${details.operation.toUpperCase()} failed: ${details.message}`);
    } finally {
      setSavingProfile(false);
    }
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

    const { error: garageError } = await supabase
      .from("motorcycles")
      .upsert(payload, { onConflict: "id" });

    if (garageError) {
      setGarageMsg(garageError.message);
      setSavingGarage(false);
      return;
    }

    setMotorcycles((prev) => prev.map((bike) => ({ ...bike, isNew: false })));
    setGarageMsg("Garage saved.");
    setSavingGarage(false);
  }

  async function handleProfileImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingImage(true);
    setProfileMsg("Uploading photo...");

    try {
      if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
      if (file.size > 6 * 1024 * 1024) throw new Error("Image must be under 6MB.");

      const filePath = `${userId}/avatar.jpg`;
      const { error: uploadError } = await withTimeout(
        supabase.storage.from("avatars").upload(filePath, file, {
          upsert: true,
          contentType: file.type || "image/jpeg",
          cacheControl: "0",
        }),
      );

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const rawImageUrl = publicUrlData.publicUrl;
      if (!rawImageUrl) throw new Error("Could not generate avatar URL.");

      await updateAvatar(withCacheBust(rawImageUrl));
      setProfileMsg("Profile photo saved to Supabase.");
    } catch (uploadError) {
      setProfileMsg(uploadError instanceof Error ? uploadError.message : "Could not upload photo.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  if (authLoading || profileLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
        <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-6 lg:px-8">
          <div className="h-80 animate-pulse rounded-[32px] border border-white/10 bg-white/[0.03]" />
        </div>
      </main>
    );
  }

  if (!session?.user || !profile) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#e87a82]">Profile Settings</p>
          <h1 className="mt-4 font-serif text-4xl">Profile could not be loaded</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">{error || "Your session may still be restoring."}</p>
          <button onClick={() => void refresh()} className="mt-8 rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300">
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(180,20,30,0.25),transparent_65%)]" />
      <div className="relative mx-auto max-w-5xl px-5 pb-28 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.38em] text-zinc-500">Profile Settings</p>
            <h1 className="mt-3 font-serif text-4xl text-white md:text-5xl">Edit Profile</h1>
          </div>
          <Link href="/profile" className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]">
            Back to Profile
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-[#111113] via-[#0b0b0d] to-[#070707]">
          <div className="px-6 py-8 md:px-8 md:py-9">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-full border border-[#b4141e]/60 shadow-[0_0_40px_-6px_rgba(180,20,30,0.7)] md:h-32 md:w-32">
                {profile.profile_image_url || profile.avatar_url ? (
                  <Image
                    src={(profile.profile_image_url || profile.avatar_url) as string}
                    alt={`${profileDisplayName(profile)} profile picture`}
                    fill
                    sizes="128px"
                    className="object-cover"
                    unoptimized={(profile.profile_image_url || profile.avatar_url || "").includes("supabase")}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10 text-[11px] uppercase tracking-[0.22em] text-zinc-400">No Photo</div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-serif text-3xl text-white md:text-4xl">{profileDisplayName(profile)}</h2>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">{profileHandle(profile)} · {profileLocation(profile)}</p>
                <label className="mt-5 inline-flex cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]">
                  {uploadingImage ? "Uploading..." : "Change Photo"}
                  <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" disabled={uploadingImage} />
                </label>
              </div>
            </div>
          </div>
        </section>

        <EditProfileForm profile={profile} saving={savingProfile} message={profileMsg} onSubmit={saveProfileDetails} />

        {profileSaveError && (
          <section className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-red-300">
              Profile Save Debug
            </p>
            <dl className="mt-3 grid gap-2 text-xs text-red-100 sm:grid-cols-2">
              <div>
                <dt className="text-red-300/70">Operation</dt>
                <dd className="break-words">{profileSaveError.operation}</dd>
              </div>
              <div>
                <dt className="text-red-300/70">Code</dt>
                <dd className="break-words">{profileSaveError.code || "none"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-red-300/70">Message</dt>
                <dd className="break-words">{profileSaveError.message}</dd>
              </div>
              {profileSaveError.details && (
                <div className="sm:col-span-2">
                  <dt className="text-red-300/70">Details</dt>
                  <dd className="break-words">{profileSaveError.details}</dd>
                </div>
              )}
              {profileSaveError.hint && (
                <div className="sm:col-span-2">
                  <dt className="text-red-300/70">Hint</dt>
                  <dd className="break-words">{profileSaveError.hint}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <section className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-zinc-500">Garage</p>
              <h2 className="mt-2 font-serif text-3xl text-white">Motorcycles</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={addMotorcycle} className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]">Add Motorcycle</button>
              <button type="button" onClick={() => void saveGarage()} disabled={savingGarage} className="rounded-full bg-[#b4141e]/80 px-5 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-[#b4141e] disabled:opacity-60">{savingGarage ? "Saving..." : "Save Garage"}</button>
            </div>
          </div>
          {garageMsg && <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-400">{garageMsg}</p>}
          <div className="mt-6 space-y-4">
            {motorcycles.map((bike, index) => (
              <div key={bike.id} className="grid gap-4 rounded-[24px] border border-white/10 bg-black/20 p-5 md:grid-cols-4">
                {(["label", "name", "year", "finish"] as const).map((field) => (
                  <input
                    key={field}
                    value={bike[field]}
                    onChange={(e) => updateMotorcycle(bike.id, field, e.target.value)}
                    placeholder={field === "label" ? `Garage ${index + 1}` : field}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#b4141e]/60"
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
