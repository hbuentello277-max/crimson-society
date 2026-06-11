"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireCompleteProfile } from "@/lib/requireCompleteProfile";
import {
  queueMediaProcessingJob,
  uploadImageDisplaySource,
  uploadOriginalMedia,
  VIDEO_LIMIT_BYTES,
  VIDEO_MAX_DURATION_SECONDS,
  videoFileSizeLimitMessage,
  type UploadedOriginalMedia,
} from "@/lib/media";
import { assertVideoDurationWithinLimit } from "@/lib/media/video-metadata";
import { triggerReelProcessing } from "@/lib/media/trigger-reel-processing";
import CrimsonSoundPicker from "@/components/CrimsonSoundPicker";
import type { CrimsonSound } from "@/lib/sounds";
import { EmptyState } from "@/components/ui/EmptyState";
import { BOTTOM_NAV_CLEARANCE, CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";

type PostType = "photo" | "reel" | "status" | "garage_build";
type GarageMotorcycle = {
  id: string;
  name: string | null;
  year: string | null;
  label: string | null;
  photo_url: string | null;
};
type TaggableRider = {
  id: string;
  name: string;
  handle: string;
  photo: string | null;
};
type Audience = "public" | "close" | "group";

type PreviewPhoto = {
  file: File;
  preview: string;
};

const statusBackgrounds = [
  {
    id: "noir",
    label: "Noir",
    className: "bg-gradient-to-br from-[#050505] via-[#0c0c0d] to-[#050505]",
  },
  {
    id: "crimson",
    label: "Crimson",
    className: "bg-gradient-to-br from-[#3a0709] via-[#b4141e] to-[#3a0709]",
  },
  {
    id: "carbon",
    label: "Carbon",
    className: "bg-gradient-to-br from-[#1a1a1c] via-[#2a2a2e] to-[#0a0a0c]",
  },
  {
    id: "ember",
    label: "Ember",
    className: "bg-gradient-to-br from-[#1a0405] via-[#6a0d14] to-[#0a0102]",
  },
];

export default function CreatePage() {
  const router = useRouter();

  const [type, setType] = useState<PostType>("photo");
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [taggedRiders, setTaggedRiders] = useState<string[]>([]);
  const [audience, setAudience] = useState<Audience>("public");
  const [photos, setPhotos] = useState<PreviewPhoto[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedSound, setSelectedSound] = useState<CrimsonSound | null>(null);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [statusBg, setStatusBg] = useState(statusBackgrounds[0]);
  const [statusText, setStatusText] = useState("");
  const [showRiderPicker, setShowRiderPicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [videoDurationLabel, setVideoDurationLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [garageMotorcycles, setGarageMotorcycles] = useState<GarageMotorcycle[]>([]);
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState("");
  const [modificationTitle, setModificationTitle] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [taggableRiders, setTaggableRiders] = useState<TaggableRider[]>([]);
  const [taggableLoading, setTaggableLoading] = useState(false);

  const loadTaggableRiders = useCallback(async () => {
    if (!userId) return;

    setTaggableLoading(true);

    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, username, display_name, full_name, profile_image_url, avatar_url")
      .neq("id", userId)
      .order("display_name", { ascending: true })
      .limit(40);

    if (error) {
      setTaggableRiders([]);
      setTaggableLoading(false);
      return;
    }

    const next = (data || [])
      .map((profile) => {
        const username = profile.username?.trim();
        if (!username) return null;

        return {
          id: profile.id as string,
          name:
            profile.display_name?.trim() ||
            profile.full_name?.trim() ||
            username,
          handle: `@${username}`,
          photo: profile.profile_image_url || profile.avatar_url || null,
        };
      })
      .filter((profile): profile is TaggableRider => profile !== null);

    setTaggableRiders(next);
    setTaggableLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!showRiderPicker || !userId) return;
    void loadTaggableRiders();
  }, [loadTaggableRiders, showRiderPicker, userId]);

  useEffect(() => {
    if (!userId) return;

    const loadMotorcycles = async () => {
      const { data, error } = await supabase
        .from("motorcycles")
        .select("id, name, year, label, photo_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        setGarageMotorcycles([]);
        return;
      }

      const rows = (data as GarageMotorcycle[]) ?? [];
      setGarageMotorcycles(rows);
      setSelectedMotorcycleId((current) => current || rows[0]?.id || "");
    };

    void loadMotorcycles();
  }, [userId]);

  useEffect(() => {
  let active = true;

  const checkUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.id) {
      if (active) {
        router.replace("/login");
      }
      return;
    }

    try {
      const complete = await requireCompleteProfile(data.user.id);

      if (!complete) {
        if (active) {
          router.replace("/profile/setup");
        }
        return;
      }

      if (active) {
        setUserId(data.user.id);
      }
    } catch {
      if (active) {
        router.replace("/profile/setup");
      }
    }
  };

  void checkUser();

  return () => {
    active = false;
  };
}, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (type !== "photo" && type !== "garage_build") {
        photos.forEach((p) => URL.revokeObjectURL(p.preview));
        setPhotos([]);
      }

      if (type !== "reel" && type !== "garage_build") {
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setVideoFile(null);
        setVideoPreview(null);
      }

      if (type !== "status") {
        setStatusText("");
        setStatusBg(statusBackgrounds[0]);
      } else {
        setSelectedSound(null);
      }

      if (type !== "garage_build") {
        setModificationTitle("");
      }
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [photos, videoPreview]);

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;

    const next = Array.from(files)
      .slice(0, 1)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return next.slice(0, 1);
    });
  };

  const handleVideo = (files: FileList | null) => {
    if (!files || !files[0]) return;

    void (async () => {
      const file = files[0];
      setMediaError(null);
      setVideoDurationLabel(null);

      try {
        if (file.size > VIDEO_LIMIT_BYTES) {
          throw new Error(videoFileSizeLimitMessage());
        }

        const duration = await assertVideoDurationWithinLimit(file);
        const minutes = Math.floor(duration / 60);
        const seconds = Math.ceil(duration % 60);
        setVideoDurationLabel(
          minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not use this video.";
        setMediaError(message);
        setVideoFile(null);
        if (videoPreview) URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
        return;
      }

      if (videoPreview) URL.revokeObjectURL(videoPreview);

      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    })();
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDurationLabel(null);
    setMediaError(null);
  };

  const toggleRider = (handle: string) => {
    setTaggedRiders((prev) =>
      prev.includes(handle)
        ? prev.filter((h) => h !== handle)
        : [...prev, handle],
    );
  };

  const canPost = () => {
    if (type === "photo") return photos.length > 0;
    if (type === "reel") return !!videoFile;
    if (type === "status") return statusText.trim().length > 0;
    if (type === "garage_build") {
      return (
        Boolean(selectedMotorcycleId) &&
        modificationTitle.trim().length > 0 &&
        (photos.length > 0 || !!videoFile)
      );
    }
    return false;
  };

  const handlePost = async () => {
    if (!canPost() || submitting) return;

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in.");

      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let imageOriginal: UploadedOriginalMedia | null = null;
      let videoOriginal: UploadedOriginalMedia | null = null;
      let mediaStatus = "ready";
      let mediaMetadata: Record<string, unknown> = {};

      if (type === "photo" && photos[0]) {
        imageOriginal = await uploadOriginalMedia(
          supabase,
          user.id,
          "image",
          photos[0].file,
        );
        const display = await uploadImageDisplaySource(
          supabase,
          imageOriginal.path,
          photos[0].file,
        );
        imageUrl = display.publicUrl;
        mediaStatus = "queued";
        mediaMetadata = {
          pipeline: "original-plus-display-source",
          originals_preserved: true,
          display_source_path: display.path,
        };
      }

      if ((type === "reel" || type === "garage_build") && videoFile) {
        await assertVideoDurationWithinLimit(videoFile);

        videoOriginal = await uploadOriginalMedia(
          supabase,
          user.id,
          "video",
          videoFile,
        );
        videoUrl = null;
        mediaStatus = "queued";
        mediaMetadata = {
          pipeline: type === "garage_build" ? "garage-build-video-pending" : "reel-mp4-playback-pending",
          originals_preserved: true,
          beta_limits: {
            max_duration_seconds: VIDEO_MAX_DURATION_SECONDS,
            max_size_bytes: VIDEO_LIMIT_BYTES,
          },
        };
      }

      if (type === "garage_build" && photos[0]) {
        imageOriginal = await uploadOriginalMedia(
          supabase,
          user.id,
          "image",
          photos[0].file,
        );
        const display = await uploadImageDisplaySource(
          supabase,
          imageOriginal.path,
          photos[0].file,
        );
        imageUrl = display.publicUrl;
        mediaStatus = "queued";
        mediaMetadata = {
          ...mediaMetadata,
          pipeline: videoFile ? "garage-build-mixed-media" : "garage-build-image",
          originals_preserved: true,
          display_source_path: display.path,
        };
      }

      const selectedMotorcycle = garageMotorcycles.find((bike) => bike.id === selectedMotorcycleId);
      if (type === "garage_build") {
        mediaMetadata = {
          ...mediaMetadata,
          garage_build: {
            motorcycle_id: selectedMotorcycleId,
            modification_title: modificationTitle.trim(),
            motorcycle_name: selectedMotorcycle?.name?.trim() || selectedMotorcycle?.label?.trim() || null,
            motorcycle_year: selectedMotorcycle?.year?.trim() || null,
            motorcycle_photo_url: selectedMotorcycle?.photo_url?.trim() || null,
          },
        };
      }

      const isStatus = type === "status";

      const payload = {
        user_id: user.id,
        post_type: type,
        caption: isStatus ? statusText : caption || null,
        image_url: imageUrl,
        video_url: videoUrl,
        status_text: isStatus ? statusText : null,
        status_bg: isStatus ? statusBg.id : null,
        location: location || null,
        media_pipeline_version: type === "status" ? 1 : 2,
        media_status: isStatus ? "ready" : mediaStatus,
        media_metadata: mediaMetadata,
        image_original_bucket: imageOriginal?.bucket ?? null,
        image_original_path: imageOriginal?.path ?? null,
        image_display_url: imageUrl,
        image_thumbnail_url: null,
        video_original_bucket: videoOriginal?.bucket ?? null,
        video_original_path: videoOriginal?.path ?? null,
        video_playback_url: null,
        video_hls_url: null,
        video_thumbnail_url: null,
      };

      const { data: insertedPost, error } = await supabase
        .from("Posts")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      if (selectedSound && insertedPost?.id) {
        const { error: soundError } = await supabase.from("post_sounds").insert({
          post_id: insertedPost.id,
          sound_id: selectedSound.id,
          user_id: user.id,
          start_time_seconds: 0,
          volume: 1,
        });

        if (soundError) throw soundError;
      }

      if (imageOriginal) {
        await queueMediaProcessingJob(supabase, {
          userId: user.id,
          postId: insertedPost?.id ?? null,
          mediaKind: "image",
          sourceBucket: imageOriginal.bucket,
          sourcePath: imageOriginal.path,
          metadata: mediaMetadata,
        });
      }

      if (videoOriginal) {
        await queueMediaProcessingJob(supabase, {
          userId: user.id,
          postId: insertedPost?.id ?? null,
          mediaKind: "video",
          sourceBucket: videoOriginal.bucket,
          sourcePath: videoOriginal.path,
          metadata: mediaMetadata,
        });

        const processResult = await triggerReelProcessing(insertedPost.id);
        if (!processResult.ok) {
          setToast(
            "Post created. Reel is queued — processing will retry automatically.",
          );
        } else if (processResult.failed && processResult.error) {
          setToast("Post created, but reel processing failed. Check your feed.");
          console.warn("[reel-processing] upload completed with worker error", {
            postId: insertedPost.id,
            error: processResult.error,
          });
        } else {
          setToast("Post created.");
        }
      } else {
        setToast("Post created.");
      }
      setTimeout(() => {
        router.push("/dashboard");
      }, 900);
        } catch (err) {
      console.error("Create post error:", err);

      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert(JSON.stringify(err, null, 2));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`min-h-screen bg-[#050505] text-white ${BOTTOM_NAV_CLEARANCE}`}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
          <Link
            href="/dashboard"
            className="text-xs uppercase tracking-[0.3em] text-white/50 hover:text-white"
          >
            ← Cancel
          </Link>

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">
              Compose
            </p>
            <h1 className="font-serif text-xl italic text-white">Create</h1>
          </div>

          <button
            onClick={handlePost}
            disabled={!canPost() || submitting}
            className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.25em] transition ${
              canPost() && !submitting
                ? "border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] hover:bg-[#b4141e]/30"
                : "cursor-not-allowed border border-white/10 text-white/30"
            }`}
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-6">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-1.5 sm:grid-cols-4">
          {(
            [
              { id: "photo" as const, label: "Post" },
              { id: "reel" as const, label: "Reel" },
              { id: "garage_build" as const, label: "Garage Build" },
              { id: "status" as const, label: "Status" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              onClick={() => setType(option.id)}
              className={`rounded-xl py-2.5 text-[10px] uppercase tracking-[0.22em] transition sm:text-[11px] sm:tracking-[0.28em] ${
                type === option.id
                  ? "border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
                  : "border border-transparent text-white/55 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="my-6 flex items-center justify-center gap-3 text-white/30">
          <div className="h-px w-12 bg-white/15" />
          <span className="text-xs">✦</span>
          <div className="h-px w-12 bg-white/15" />
        </div>

        {type === "photo" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
                Frames
              </p>

              {photos.length === 0 ? (
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="flex h-40 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/40 text-center transition hover:border-[#b4141e]/60 hover:bg-black/60"
                >
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 text-xl text-[#e87a82]">
                    ＋
                  </div>
                  <p className="font-serif text-lg italic text-white">Add photo</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                    JPG · PNG · WebP
                  </p>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photos[0].preview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{photos[0].file.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/40">
                      Photo selected
                    </p>
                  </div>
                  <button
                    onClick={() => removePhoto(0)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-xs text-white/70 hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => handlePhotos(e.target.files)}
              />
            </div>
          </section>
        )}

        {type === "reel" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
                Reel
              </p>

              {!videoPreview ? (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="flex h-40 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/40 text-center transition hover:border-[#b4141e]/60 hover:bg-black/60"
                >
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 text-xl text-[#e87a82]">
                    ▶
                  </div>
                  <p className="font-serif text-lg italic text-white">Upload reel</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-white/40">
                    MP4, MOV, or WEBM · 60s max · 50MB max
                  </p>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 p-3">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
                    <video
                      src={videoPreview}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{videoFile?.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/40">
                      {videoDurationLabel ? `${videoDurationLabel} · ` : ""}Reel selected
                    </p>
                  </div>
                  <button
                    onClick={clearVideo}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/15 text-xs text-white/70 hover:border-[#b4141e]/50 hover:text-[#e87a82]"
                    aria-label="Remove reel"
                  >
                    ✕
                  </button>
                </div>
              )}

              {mediaError && (
                <p className="mt-3 rounded-lg border border-[#b4141e]/35 bg-[#b4141e]/10 px-3 py-2 text-xs leading-5 text-[#e87a82]">
                  {mediaError}
                </p>
              )}

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={(e) => handleVideo(e.target.files)}
              />

              <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Crimson Sound
                </p>
                <button
                  type="button"
                  onClick={() => setShowSoundPicker(true)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-[#b4141e]/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">
                      {selectedSound
                        ? selectedSound.artist
                          ? `${selectedSound.artist} - ${selectedSound.title}`
                          : selectedSound.title
                        : "Choose from Crimson Sounds"}
                    </span>
                    <span className="mt-1 block text-[10px] uppercase tracking-[0.22em] text-white/35">
                      Approved internal library
                    </span>
                  </span>
                  <span className="text-[#e87a82]">♪</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {type === "garage_build" && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">Ride</p>
              {garageMotorcycles.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Add a ride in Edit Profile before posting a Garage Build.
                </p>
              ) : (
                <select
                  value={selectedMotorcycleId}
                  onChange={(e) => setSelectedMotorcycleId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none"
                >
                  {garageMotorcycles.map((bike) => (
                    <option key={bike.id} value={bike.id}>
                      {[bike.year, bike.name || bike.label].filter(Boolean).join(" ") || "Ride"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
                Modification Title
              </p>
              <input
                value={modificationTitle}
                onChange={(e) => setModificationTitle(e.target.value)}
                placeholder="Installed Full Exhaust"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">Photos</p>
              {photos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/40 text-center transition hover:border-[#b4141e]/60"
                >
                  <p className="font-serif text-lg italic text-white">Add photo</p>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photos[0].preview} alt="" className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(0)}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">Video (optional)</p>
              {!videoPreview ? (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/40 text-sm text-white/70"
                >
                  Add video
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 p-3">
                  <video src={videoPreview} muted playsInline className="h-16 w-16 rounded-lg object-cover" />
                  <button type="button" onClick={clearVideo} className="text-xs text-white/70">
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-white/40">Description</p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Installed and tuned the new system."
                rows={4}
                className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
          </section>
        )}

        {type === "status" && (
          <section className="space-y-4">
            <div
              className={`relative overflow-hidden rounded-2xl border border-white/10 ${statusBg.className} p-6`}
              style={{ minHeight: "260px" }}
            >
              <textarea
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                placeholder="Speak."
                maxLength={280}
                className="h-full min-h-[220px] w-full resize-none bg-transparent font-serif text-2xl italic text-white outline-none placeholder:text-white/30"
              />
              <div className="absolute bottom-3 right-4 text-[10px] uppercase tracking-[0.3em] text-white/40">
                {statusText.length}/280
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
              <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
                Backdrop
              </p>
              <div className="grid grid-cols-4 gap-2">
                {statusBackgrounds.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setStatusBg(bg)}
                    className={`relative h-16 overflow-hidden rounded-xl border transition ${
                      statusBg.id === bg.id
                        ? "border-[#b4141e] shadow-[0_0_15px_rgba(180,20,30,0.4)]"
                        : "border-white/10 hover:border-white/30"
                    } ${bg.className}`}
                  >
                    <span className="absolute bottom-1 left-1 text-[9px] uppercase tracking-[0.2em] text-white/80">
                      {bg.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {type !== "status" && type !== "garage_build" && (
          <>
            {type === "photo" && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
                <button
                  type="button"
                  onClick={() => setShowSoundPicker(true)}
                  className="flex min-h-14 w-full items-center justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] uppercase tracking-[0.35em] text-white/40">
                      Crimson Sound
                    </span>
                    <span className="mt-1 block truncate text-sm text-white">
                      {selectedSound
                        ? selectedSound.artist
                          ? `${selectedSound.artist} - ${selectedSound.title}`
                          : selectedSound.title
                        : "Add music to this post"}
                    </span>
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#b4141e]/35 bg-[#b4141e]/10 text-[#e87a82]">
                    ♪
                  </span>
                </button>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-white/40">
                Caption
              </p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Say something about this ride..."
                rows={3}
                className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
          </>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-white/40">
            Location
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[#e87a82]">⌖</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Tag a place"
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
          <button
            onClick={() => setShowRiderPicker(true)}
            className="flex w-full items-center justify-between"
          >
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">
                Tag Riders
              </p>
              <p className="mt-1 text-sm text-white">
                {taggedRiders.length === 0
                  ? "Add riders"
                  : `${taggedRiders.length} tagged`}
              </p>
            </div>
            <span className="text-white/30">›</span>
          </button>

          {taggedRiders.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {taggedRiders.map((h) => (
                <span
                  key={h}
                  className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-3 py-1 text-xs text-[#e87a82]"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
            Audience
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: "public", label: "Public", sub: "All riders" },
              { id: "close", label: "Close", sub: "Inner circle" },
              { id: "group", label: "Group", sub: "Specific chat" },
            ] as { id: Audience; label: string; sub: string }[]).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAudience(opt.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  audience === opt.id
                    ? "border-[#b4141e] bg-[#b4141e]/10"
                    : "border-white/10 bg-black/30 hover:border-white/30"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white">
                  {opt.label}
                </p>
                <p className="mt-1 text-[10px] text-white/40">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

      </div>

      {showRiderPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowRiderPicker(false)}
        >
          <div
            className="w-full max-w-2xl rounded-t-3xl border-t border-white/10 bg-[#0a0a0b] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                  Tag
                </p>
                <h2 className="font-serif text-2xl italic text-white">
                  Riders
                </h2>
              </div>
              <button
                onClick={() => setShowRiderPicker(false)}
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white/70 hover:bg-white/5"
              >
                Done
              </button>
            </div>

            <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
              {taggableLoading && (
                <div className="rounded-xl border border-white/10 p-4 text-sm text-white/50">
                  Loading riders from the Society...
                </div>
              )}

              {!taggableLoading && taggableRiders.length === 0 && (
                <EmptyState
                  className="rounded-xl p-6"
                  title="No riders to tag yet."
                  body="As more members complete their profiles, you can tag them here."
                />
              )}

              {!taggableLoading &&
                taggableRiders.map((r) => {
                const isTagged = taggedRiders.includes(r.handle);
                return (
                  <button
                    key={r.id}
                    onClick={() => toggleRider(r.handle)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      isTagged
                        ? "border-[#b4141e] bg-[#b4141e]/10"
                        : "border-white/10 hover:bg-white/5"
                    }`}
                  >
                    <div className={`relative h-11 w-11 ${CS_AVATAR_RING}`}>
                      {r.photo ? (
                        <Image
                          src={r.photo}
                          alt={r.name}
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        <div className={`${CS_AVATAR_FALLBACK} text-sm`}>
                          {r.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{r.name}</p>
                      <p className="text-[11px] text-white/40">{r.handle}</p>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        isTagged
                          ? "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
                          : "border-white/20"
                      }`}
                    >
                      {isTagged ? "✓" : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showSoundPicker && (
        <CrimsonSoundPicker
          userId={userId}
          selectedSound={selectedSound}
          onSelect={setSelectedSound}
          onClose={() => setShowSoundPicker(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
          {toast}
        </div>
      )}
    </main>
  );
}
