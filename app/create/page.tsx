"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  queueMediaProcessingJob,
  uploadImageDisplaySource,
  uploadOriginalMedia,
  type UploadedOriginalMedia,
} from "@/lib/media";

type PostType = "photo" | "reel" | "status";
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
  const [musicLabel, setMusicLabel] = useState("");
  const [statusBg, setStatusBg] = useState(statusBackgrounds[0]);
  const [statusText, setStatusText] = useState("");
  const [showRiderPicker, setShowRiderPicker] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const mockRiders = [
    {
      id: "1",
      name: "Marco Vélez",
      handle: "@nightrider",
      photo:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200",
    },
    {
      id: "2",
      name: "Elena Ruiz",
      handle: "@ironsaint",
      photo:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    },
    {
      id: "3",
      name: "Devin Cole",
      handle: "@blackmass",
      photo:
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200",
    },
    {
      id: "4",
      name: "Aiyana Cross",
      handle: "@savagegrace",
      photo:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    },
    {
      id: "5",
      name: "Roman Petrov",
      handle: "@longshadow",
      photo:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    },
    {
      id: "6",
      name: "Sofia Marín",
      handle: "@redveil",
      photo:
        "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200",
    },
  ];

  useEffect(() => {
    if (type !== "photo") {
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
    }

    if (type !== "reel") {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoFile(null);
      setVideoPreview(null);
      setMusicLabel("");
    }

    if (type !== "status") {
      setStatusText("");
      setStatusBg(statusBackgrounds[0]);
    }
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
      .slice(0, 6)
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

    setPhotos((prev) => {
      const merged = [...prev, ...next].slice(0, 6);
      return merged;
    });
  };

  const handleVideo = (files: FileList | null) => {
    if (!files || !files[0]) return;

    if (videoPreview) URL.revokeObjectURL(videoPreview);

    const file = files[0];
    const preview = URL.createObjectURL(file);

    setVideoFile(file);
    setVideoPreview(preview);
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

      if (type === "reel" && videoFile) {
        videoOriginal = await uploadOriginalMedia(
          supabase,
          user.id,
          "video",
          videoFile,
        );
        videoUrl = null;
        mediaStatus = "queued";
        mediaMetadata = {
          pipeline: "adaptive-video-pending",
          originals_preserved: true,
          playback_note: "Raw video is stored privately and awaits ABR processing.",
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
        .from('"Posts"')
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

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
      }

      setToast("Post created.");
      setTimeout(() => {
        router.push("/dashboard");
      }, 900);
    } catch (err: any) {
      console.error("Create post error:", err);
      alert(err?.message || "Something went wrong while creating the post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] pb-32 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
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
                ? "bg-[#b4141e] text-white hover:bg-[#d11827]"
                : "cursor-not-allowed border border-white/10 text-white/30"
            }`}
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 pt-6">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-1.5">
          {(["photo", "reel", "status"] as PostType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-xl py-2.5 text-[11px] uppercase tracking-[0.3em] transition ${
                type === t
                  ? "bg-[#b4141e] text-white shadow-[0_0_20px_rgba(180,20,30,0.35)]"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {t}
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
                  className="flex h-56 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/40 text-center transition hover:border-[#b4141e]/60 hover:bg-black/60"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 text-2xl text-[#e87a82]">
                    ＋
                  </div>
                  <p className="font-serif text-lg italic text-white">Add Frames</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                    Up to 6 · JPG · PNG
                  </p>
                </button>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((item, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square overflow-hidden rounded-xl border border-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-xs text-white backdrop-blur hover:bg-[#b4141e]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/40 text-white/40 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
                    >
                      <span className="text-2xl">＋</span>
                      <span className="text-[10px] uppercase tracking-[0.25em]">
                        Add
                      </span>
                    </button>
                  )}
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
                  className="flex h-72 w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/40 text-center transition hover:border-[#b4141e]/60 hover:bg-black/60"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 text-2xl text-[#e87a82]">
                    ▶
                  </div>
                  <p className="font-serif text-lg italic text-white">Upload Reel</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-white/40">
                    MP4 · MOV
                  </p>
                </button>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
                  <video
                    src={videoPreview}
                    controls
                    className="h-80 w-full object-cover"
                  />
                  <button
                    onClick={clearVideo}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-xs text-white backdrop-blur hover:bg-[#b4141e]"
                  >
                    ✕
                  </button>
                </div>
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
                  Soundtrack
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[#e87a82]">♪</span>
                  <input
                    value={musicLabel}
                    onChange={(e) => setMusicLabel(e.target.value)}
                    placeholder="Artist — Track"
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                  />
                </div>
              </div>
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

        {type !== "status" && (
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
                  ? "Add the brotherhood"
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

        {canPost() && (
          <>
            <div className="my-8 flex items-center justify-center gap-3 text-white/30">
              <div className="h-px w-12 bg-white/15" />
              <span className="text-xs">✦</span>
              <div className="h-px w-12 bg-white/15" />
            </div>

            <p className="mb-3 text-center text-[10px] uppercase tracking-[0.4em] text-white/40">
              Preview
            </p>

            <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707]">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#b4141e] font-serif italic text-white">
                  CS
                </div>
                <div>
                  <p className="text-sm text-white">Hector Buentello</p>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                    @hbuentello {location && `· ${location}`}
                  </p>
                </div>
              </div>

              {type === "photo" && photos[0] && (
                <div className="relative aspect-square bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photos[0].preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  {photos.length > 1 && (
                    <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur">
                      1 / {photos.length}
                    </span>
                  )}
                </div>
              )}

              {type === "reel" && videoPreview && (
                <div className="relative aspect-[9/16] max-h-[480px] bg-black">
                  <video
                    src={videoPreview}
                    className="h-full w-full object-cover"
                    muted
                    autoPlay
                    loop
                  />
                  {musicLabel && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-white backdrop-blur">
                      <span className="text-[#e87a82]">♪</span>
                      {musicLabel}
                    </div>
                  )}
                </div>
              )}

              {type === "status" && statusText && (
                <div
                  className={`flex min-h-[240px] items-center justify-center p-8 ${statusBg.className}`}
                >
                  <p className="text-center font-serif text-2xl italic text-white">
                    {statusText}
                  </p>
                </div>
              )}

              {type !== "status" && caption && (
                <p className="px-4 pb-4 pt-3 text-sm text-white/80">{caption}</p>
              )}

              {taggedRiders.length > 0 && (
                <p className="px-4 pb-4 text-[11px] text-[#e87a82]">
                  with {taggedRiders.join(" · ")}
                </p>
              )}
            </article>
          </>
        )}
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
              {mockRiders.map((r) => {
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
                    <div className="relative h-11 w-11 overflow-hidden rounded-full border border-white/10">
                      <Image
                        src={r.photo}
                        alt={r.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white">{r.name}</p>
                      <p className="text-[11px] text-white/40">{r.handle}</p>
                    </div>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                        isTagged
                          ? "border-[#b4141e] bg-[#b4141e] text-white"
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

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-[#b4141e]/40 bg-[#0a0a0b]/95 px-5 py-2.5 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_30px_rgba(180,20,30,0.4)] backdrop-blur">
          {toast}
        </div>
      )}
    </main>
  );
}
