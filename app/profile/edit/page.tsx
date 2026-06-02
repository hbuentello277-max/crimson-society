"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import EditProfileForm from "@/components/profile/EditProfileForm";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import {
  profileDisplayName,
  profileHandle,
  profileLocation,
  type ProfileIdentityInput,
} from "@/lib/profile";
import { supabase } from "@/lib/supabase";

type Motorcycle = {
  id: string;
  label: string;
  name: string;
  year: string;
  finish: string;
  photoUrl: string | null;
  photoPath: string | null;
  uploadingPhoto: boolean;
  isNew: boolean;
};

type MotorcycleRow = {
  id: string;
  label: string | null;
  name: string | null;
  year: string | null;
  finish: string | null;
  photo_url: string | null;
  photo_path: string | null;
};

type MotorcycleTextField = "label" | "name" | "year" | "finish";

const GARAGE_PHOTO_BUCKET = "garage-bike-photos";

const policyLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/community-guidelines", label: "Guidelines" },
  { href: "/safety", label: "Safety" },
];

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

function bikeInitial(bike: Pick<Motorcycle, "name" | "label">) {
  return (bike.name.trim() || bike.label.trim() || "G").charAt(0).toUpperCase();
}

function storageExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  return file.type.split("/")[1] || "jpg";
}

export default function ProfileEditPage() {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error, updateIdentity, updateAvatar, refresh } = useProfile();
  const userId = session?.user?.id ?? null;
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGarage, setSavingGarage] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [garageMsg, setGarageMsg] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);

  useEffect(() => {
    if (authLoading || !userId) return;

    const loadGarage = async () => {
      const { data } = await supabase
        .from("motorcycles")
        .select("id, label, name, year, finish, photo_url, photo_path")
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
              photoUrl: bike.photo_url,
              photoPath: bike.photo_path,
              uploadingPhoto: false,
              isNew: false,
            }))
          : [
              {
                id: crypto.randomUUID(),
                label: "Garage One",
                name: "",
                year: "",
                finish: "",
                photoUrl: null,
                photoPath: null,
                uploadingPhoto: false,
                isNew: true,
              },
            ],
      );
    };

    void loadGarage();
  }, [authLoading, userId]);

  function updateMotorcycle(
    id: string,
    field: MotorcycleTextField,
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
        photoUrl: null,
        photoPath: null,
        uploadingPhoto: false,
        isNew: true,
      },
    ]);
  }

  function setMotorcycleUploading(id: string, uploadingPhoto: boolean) {
    setMotorcycles((prev) =>
      prev.map((bike) => (bike.id === id ? { ...bike, uploadingPhoto } : bike)),
    );
  }

  function updateMotorcyclePhoto(id: string, photoUrl: string | null, photoPath: string | null) {
    setMotorcycles((prev) =>
      prev.map((bike) =>
        bike.id === id ? { ...bike, photoUrl, photoPath, isNew: false, uploadingPhoto: false } : bike,
      ),
    );
  }

  async function saveProfileDetails(values: ProfileIdentityInput) {
    setSavingProfile(true);
    setProfileMsg("");

    try {
      await updateIdentity(values);
      setProfileMsg("Profile saved.");
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Could not save profile. Please try again.";
      setProfileMsg(message);
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
      photo_url: bike.photoUrl,
      photo_path: bike.photoPath,
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

  async function handleBikePhotoUpload(e: ChangeEvent<HTMLInputElement>, bikeId: string) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const bike = motorcycles.find((item) => item.id === bikeId);
    if (!bike) return;

    setMotorcycleUploading(bikeId, true);
    setGarageMsg("Uploading motorcycle photo...");

    try {
      if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
      if (file.size > 8 * 1024 * 1024) throw new Error("Bike photo must be under 8MB.");

      const filePath = `${userId}/${bikeId}/${Date.now()}.${storageExtension(file)}`;
      const { error: uploadError } = await withTimeout(
        supabase.storage.from(GARAGE_PHOTO_BUCKET).upload(filePath, file, {
          upsert: false,
          contentType: file.type || "image/jpeg",
          cacheControl: "3600",
        }),
      );

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(GARAGE_PHOTO_BUCKET)
        .getPublicUrl(filePath);
      const rawImageUrl = publicUrlData.publicUrl;
      if (!rawImageUrl) throw new Error("Could not generate motorcycle photo URL.");

      const photoUrl = withCacheBust(rawImageUrl);
      const { error: garageError } = await supabase.from("motorcycles").upsert(
        {
          id: bike.id,
          user_id: userId,
          label: bike.label.trim() || "Garage",
          name: bike.name.trim(),
          year: bike.year.trim(),
          finish: bike.finish.trim(),
          photo_url: photoUrl,
          photo_path: filePath,
        },
        { onConflict: "id" },
      );

      if (garageError) throw garageError;

      if (bike.photoPath && bike.photoPath !== filePath) {
        await supabase.storage.from(GARAGE_PHOTO_BUCKET).remove([bike.photoPath]);
      }

      updateMotorcyclePhoto(bikeId, photoUrl, filePath);
      setGarageMsg("Motorcycle photo saved.");
    } catch (uploadError) {
      setMotorcycleUploading(bikeId, false);
      setGarageMsg(uploadError instanceof Error ? uploadError.message : "Could not upload motorcycle photo.");
    } finally {
      e.target.value = "";
    }
  }

  async function removeBikePhoto(bikeId: string) {
    if (!userId) return;

    const bike = motorcycles.find((item) => item.id === bikeId);
    if (!bike) return;

    setMotorcycleUploading(bikeId, true);
    setGarageMsg("Removing motorcycle photo...");

    try {
      if (bike.photoPath) {
        await supabase.storage.from(GARAGE_PHOTO_BUCKET).remove([bike.photoPath]);
      }

      const { error: garageError } = await supabase.from("motorcycles").upsert(
        {
          id: bike.id,
          user_id: userId,
          label: bike.label.trim() || "Garage",
          name: bike.name.trim(),
          year: bike.year.trim(),
          finish: bike.finish.trim(),
          photo_url: null,
          photo_path: null,
        },
        { onConflict: "id" },
      );

      if (garageError) throw garageError;

      updateMotorcyclePhoto(bikeId, null, null);
      setGarageMsg("Motorcycle photo removed.");
    } catch (removeError) {
      setMotorcycleUploading(bikeId, false);
      setGarageMsg(removeError instanceof Error ? removeError.message : "Could not remove motorcycle photo.");
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
              <div key={bike.id} className="grid gap-5 rounded-[24px] border border-white/10 bg-black/20 p-5 md:grid-cols-[180px_1fr]">
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] border border-white/10 bg-[#080809]">
                    {bike.photoUrl ? (
                      <Image
                        src={bike.photoUrl}
                        alt={`${bike.name || bike.label || "Motorcycle"} photo`}
                        fill
                        sizes="180px"
                        className="object-cover"
                        unoptimized={bike.photoUrl.includes("supabase")}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(180,20,30,0.22),transparent_58%)] font-serif text-4xl text-[#f0c8cb]">
                        {bikeInitial(bike)}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-[#b4141e]/60 hover:text-[#e87a82]">
                      {bike.uploadingPhoto ? "Uploading" : bike.photoUrl ? "Change" : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleBikePhotoUpload(e, bike.id)}
                        className="hidden"
                        disabled={bike.uploadingPhoto}
                      />
                    </label>
                    {bike.photoUrl && (
                      <button
                        type="button"
                        onClick={() => void removeBikePhoto(bike.id)}
                        disabled={bike.uploadingPhoto}
                        className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition hover:border-[#b4141e]/60 hover:text-[#e87a82] disabled:opacity-60"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid content-start gap-4 md:grid-cols-2">
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
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
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
    </main>
  );
}
