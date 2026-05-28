"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  AUDIO_ORIGINAL_BUCKET,
  AUDIO_RENDER_BUCKET,
  MAX_AUDIO_DURATION_SECONDS,
  MAX_AUDIO_FILE_SIZE_BYTES,
  formatFileSize,
  formatSoundDuration,
  isAllowedAudioFile,
  isAudioFileTooLarge,
  loadAudioDuration,
  playExclusiveSound,
  stopCrimsonSound,
  type CrimsonSound,
  type SoundCategory,
} from "@/lib/sounds";

type SoundForm = {
  id: string | null;
  title: string;
  artist: string;
  duration: string;
  mood: string;
  tags: string;
  bpm: string;
  categoryId: string;
  audioUrl: string;
  coverImageUrl: string;
  licenseType: string;
  rightsOwner: string;
  sourceUrl: string;
  approvedSource: boolean;
  featured: boolean;
  approved: boolean;
  trending: boolean;
  licenseNotes: string;
};

type UploadedAudioAsset = {
  originalBucket: string;
  originalPath: string;
  renderBucket: string;
  renderPath: string;
  publicUrl: string;
};

type ToggleFieldKey = "approved" | "featured" | "trending" | "approvedSource";

const toggleFields: Array<{ key: ToggleFieldKey; label: string }> = [
  { key: "approved", label: "Approved" },
  { key: "featured", label: "Featured" },
  { key: "trending", label: "Trending" },
  { key: "approvedSource", label: "Verified source" },
];

const emptyForm: SoundForm = {
  id: null,
  title: "",
  artist: "",
  duration: "",
  mood: "",
  tags: "",
  bpm: "",
  categoryId: "",
  audioUrl: "",
  coverImageUrl: "",
  licenseType: "crimson_curated_upload",
  rightsOwner: "",
  sourceUrl: "",
  approvedSource: true,
  featured: false,
  approved: false,
  trending: false,
  licenseNotes: "Curated by Crimson Society",
};

function fileExt(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "bin" : "bin";
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function mapSoundToForm(sound: CrimsonSound): SoundForm {
  return {
    id: sound.id,
    title: sound.title || "",
    artist: sound.artist || "",
    duration: sound.duration_seconds ? String(sound.duration_seconds) : "",
    mood: sound.mood || "",
    tags: sound.tags || "",
    bpm: sound.bpm ? String(sound.bpm) : "",
    categoryId: sound.category_id || "",
    audioUrl: sound.audio_url || sound.preview_url || "",
    coverImageUrl: sound.cover_image_url || "",
    licenseType: sound.license_type || "crimson_curated_upload",
    rightsOwner: sound.rights_owner || "",
    sourceUrl: sound.source_url || "",
    approvedSource: sound.approved_source ?? true,
    featured: sound.featured,
    approved: sound.approved,
    trending: sound.trending ?? false,
    licenseNotes: sound.license_notes || "Curated by Crimson Society",
  };
}

export default function AdminSoundsPage() {
  const { session, loading: authLoading, isAdmin } = useAuth();

  const [sounds, setSounds] = useState<CrimsonSound[]>([]);
  const [categories, setCategories] = useState<SoundCategory[]>([]);
  const [form, setForm] = useState<SoundForm>(emptyForm);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "approved" | "pending" | "featured" | "trending">("all");
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user?.id ?? null;
  const canSave = !!form.title.trim() && !!(form.audioUrl.trim() || audioFile || form.id);

  const approvedCount = useMemo(
    () => sounds.filter((sound) => sound.approved && !sound.disabled_at).length,
    [sounds],
  );

  const filteredSounds = useMemo(() => {
    const needle = filterQuery.trim().toLowerCase();

    return sounds.filter((sound) => {
      const matchesQuery =
        !needle ||
        `${sound.title} ${sound.artist || ""} ${sound.mood || ""} ${sound.tags || ""}`
          .toLowerCase()
          .includes(needle);

      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "approved"
            ? sound.approved
            : filterStatus === "pending"
              ? !sound.approved
              : filterStatus === "featured"
                ? sound.featured
                : !!sound.trending;

      return matchesQuery && matchesStatus;
    });
  }, [filterQuery, filterStatus, sounds]);

  async function loadLibrary() {
    setLoading(true);
    setErrorMsg("");

    const [soundsResponse, categoriesResponse] = await Promise.all([
      supabase
        .from("sounds")
        .select(
          `
          id,
          title,
          artist,
          description,
          duration_seconds,
          mood,
          bpm,
          cover_image_url,
          audio_url,
          preview_url,
          provider,
          license_type,
          license_notes,
          rights_owner,
          source_url,
          approved_source,
          copyright_status,
          moderation_status,
          file_size_bytes,
          mime_type,
          original_bucket,
          original_path,
          render_bucket,
          render_path,
          import_source_name,
          approved,
          featured,
          trending,
          tags,
          usage_count,
          category_id,
          disabled_at,
          created_at,
          sound_categories (
            id,
            name,
            slug
          )
        `,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("sound_categories")
        .select("id, name, slug, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    if (soundsResponse.error) {
      setErrorMsg(soundsResponse.error.message);
    } else {
      setSounds((soundsResponse.data as unknown as CrimsonSound[]) || []);
    }

    if (!categoriesResponse.error) {
      setCategories((categoriesResponse.data as SoundCategory[]) || []);
    }

    setLoading(false);
  }

  useEffect(() => {
  if (authLoading) return;
  if (!session?.user || !isAdmin) return;

  const timer = window.setTimeout(() => {
    void loadLibrary();
  }, 0);

  return () => window.clearTimeout(timer);
}, [authLoading, session?.user, isAdmin]);
  useEffect(() => {
    return () => stopCrimsonSound();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setAudioFile(null);
    setCoverFile(null);
    setUploadProgress(0);
    if (audioInputRef.current) audioInputRef.current.value = "";
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function onAudioPicked(file: File | null) {
    if (!file) return;
    setAudioFile(file);
    if (!form.title.trim()) {
      const derivedTitle = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
      setForm((prev) => ({ ...prev, title: derivedTitle }));
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onAudioPicked(file);
  }

  function handleAudioInput(event: ChangeEvent<HTMLInputElement>) {
    onAudioPicked(event.target.files?.[0] || null);
  }

  async function uploadAudioAsset(file: File): Promise<UploadedAudioAsset> {
    if (!isAllowedAudioFile(file)) {
      throw new Error("Use MP3, M4A, AAC, or WAV only.");
    }

    if (isAudioFileTooLarge(file)) {
      throw new Error(`Audio files must stay under ${formatFileSize(MAX_AUDIO_FILE_SIZE_BYTES)}.`);
    }

    const duration = await loadAudioDuration(file);

    if (duration > MAX_AUDIO_DURATION_SECONDS) {
      throw new Error(`Audio must be ${formatSoundDuration(MAX_AUDIO_DURATION_SECONDS)} or shorter.`);
    }

    const id = crypto.randomUUID();
    const ext = fileExt(file);
    const originalPath = `curated/${id}/original.${ext}`;
    const renderPath = `curated/${id}/stream.${ext}`;

    setUploadProgress(20);

    const { error: originalError } = await supabase.storage.from(AUDIO_ORIGINAL_BUCKET).upload(originalPath, file, {
      cacheControl: "31536000",
      contentType: file.type || undefined,
      upsert: false,
    });

    if (originalError) {
      throw originalError;
    }

    setUploadProgress(60);

    const { error: renderError } = await supabase.storage.from(AUDIO_RENDER_BUCKET).upload(renderPath, file, {
      cacheControl: "31536000",
      contentType: file.type || undefined,
      upsert: false,
    });

    if (renderError) {
      throw renderError;
    }

    setUploadProgress(90);

    const { data } = supabase.storage.from(AUDIO_RENDER_BUCKET).getPublicUrl(renderPath);

    return {
      originalBucket: AUDIO_ORIGINAL_BUCKET,
      originalPath,
      renderBucket: AUDIO_RENDER_BUCKET,
      renderPath,
      publicUrl: data.publicUrl,
    };
  }

  async function uploadRenderFile(file: File, kind: "cover") {
    const id = crypto.randomUUID();
    const path = `${kind}/${id}.${fileExt(file)}`;

    const { error } = await supabase.storage.from(AUDIO_RENDER_BUCKET).upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || undefined,
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from(AUDIO_RENDER_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSave() {
    if (!userId || !canSave || saving) return;

    setSaving(true);
    setMessage("");
    setErrorMsg("");

    try {
      const existingSound = form.id ? sounds.find((sound) => sound.id === form.id) ?? null : null;

      let audioUrl = form.audioUrl.trim() || existingSound?.audio_url || existingSound?.preview_url || "";
      let coverImageUrl = form.coverImageUrl.trim();
      let uploadedAsset: UploadedAudioAsset | null = null;
      let detectedDuration = form.duration ? parseOptionalNumber(form.duration) : existingSound?.duration_seconds ?? null;

      if (audioFile) {
        detectedDuration = Math.round(await loadAudioDuration(audioFile));
        uploadedAsset = await uploadAudioAsset(audioFile);
        audioUrl = uploadedAsset.publicUrl;
      }

      if (coverFile) {
        coverImageUrl = await uploadRenderFile(coverFile, "cover");
      }

      if (!audioUrl) {
        throw new Error("Upload a soundtrack file or provide an audio URL before saving.");
      }

      const basePayload = {
        title: form.title.trim(),
        artist: form.artist.trim() || null,
        duration_seconds: detectedDuration,
        mood: form.mood.trim() || null,
        tags: form.tags.trim() || null,
        bpm: parseOptionalNumber(form.bpm),
        category_id: form.categoryId || null,
        audio_url: audioUrl,
        preview_url: audioUrl,
        cover_image_url: coverImageUrl || null,
        uploaded_by: userId,
        provider: "crimson_curated",
        license_type: form.licenseType.trim() || "crimson_curated_upload",
        rights_owner: form.rightsOwner.trim() || null,
        source_url: form.sourceUrl.trim() || null,
        license_notes: form.licenseNotes.trim() || "Curated by Crimson Society",
        approved_source: form.approvedSource,
        copyright_status: form.approvedSource ? "verified" : "needs_review",
        moderation_status: form.approved ? "approved" : "pending",
        import_source_name: "Crimson Curated",
        approved: form.approved,
        featured: form.featured,
        trending: form.trending,
      };

      const storageMetadata = audioFile
        ? {
            file_size_bytes: audioFile.size,
            mime_type: audioFile.type || null,
            original_bucket: uploadedAsset?.originalBucket ?? null,
            original_path: uploadedAsset?.originalPath ?? null,
            render_bucket: uploadedAsset?.renderBucket ?? AUDIO_RENDER_BUCKET,
            render_path: uploadedAsset?.renderPath ?? null,
          }
        : {};

      const payload = {
        ...basePayload,
        ...storageMetadata,
      };

      let soundId = form.id;

      if (form.id) {
        const { error } = await supabase.from("sounds").update(payload).eq("id", form.id);
        if (error) {
          throw error;
        }
      } else {
        const insertPayload = {
          ...payload,
          file_size_bytes: audioFile?.size ?? null,
          mime_type: audioFile?.type || null,
          original_bucket: uploadedAsset?.originalBucket ?? null,
          original_path: uploadedAsset?.originalPath ?? null,
          render_bucket: uploadedAsset?.renderBucket ?? AUDIO_RENDER_BUCKET,
          render_path: uploadedAsset?.renderPath ?? null,
        };

        const { data: insertedSound, error } = await supabase
          .from("sounds")
          .insert(insertPayload)
          .select("id")
          .single();

        if (error) {
          throw error;
        }

        soundId = insertedSound?.id || null;
      }

      if (soundId) {
        const { error: audioTrackError } = await supabase.from("audio_tracks").upsert(
          {
            sound_id: soundId,
            title: basePayload.title,
            artist: basePayload.artist,
            duration_seconds: basePayload.duration_seconds,
            category_id: basePayload.category_id,
            mood: basePayload.mood,
            tags: basePayload.tags,
            bpm: basePayload.bpm,
            original_bucket: audioFile
              ? uploadedAsset?.originalBucket ?? null
              : existingSound?.original_bucket ?? null,
            original_path: audioFile
              ? uploadedAsset?.originalPath ?? null
              : existingSound?.original_path ?? null,
            render_bucket: audioFile
              ? uploadedAsset?.renderBucket ?? AUDIO_RENDER_BUCKET
              : existingSound?.render_bucket ?? null,
            render_path: audioFile
              ? uploadedAsset?.renderPath ?? null
              : existingSound?.render_path ?? null,
            public_stream_url: audioUrl,
            preview_url: audioUrl,
            cover_image_url: basePayload.cover_image_url,
            file_size_bytes: audioFile ? audioFile.size : existingSound?.file_size_bytes ?? null,
            mime_type: audioFile ? audioFile.type || null : existingSound?.mime_type ?? null,
            provider: basePayload.provider,
            import_source_name: basePayload.import_source_name,
            source_url: basePayload.source_url || audioUrl,
            license_type: basePayload.license_type,
            license_notes: basePayload.license_notes,
            rights_owner: basePayload.rights_owner,
            approved_source: basePayload.approved_source,
            copyright_status: basePayload.copyright_status,
            approved: basePayload.approved,
            featured: basePayload.featured,
            moderation_status: basePayload.moderation_status,
            uploaded_by: basePayload.uploaded_by,
            trending: basePayload.trending,
          },
          { onConflict: "sound_id" },
        );

        if (audioTrackError) {
          throw audioTrackError;
        }
      }

      setUploadProgress(100);
      setMessage(form.id ? "Soundtrack updated." : "Soundtrack uploaded and saved.");
      resetForm();
      await loadLibrary();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not save soundtrack.");
    } finally {
      setSaving(false);
      setTimeout(() => setUploadProgress(0), 1200);
    }
  }

  async function updateSound(id: string, patch: Partial<CrimsonSound>) {
    const nextPatch: Partial<CrimsonSound> = { ...patch };

    if (patch.approved === true) {
      nextPatch.moderation_status = "approved";
      nextPatch.copyright_status = "verified";
    }

    if (patch.approved === false) {
      nextPatch.moderation_status = "pending";
    }

    setSounds((prev) => prev.map((sound) => (sound.id === id ? { ...sound, ...nextPatch } : sound)));

    const { error } = await supabase.from("sounds").update(nextPatch).eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      await loadLibrary();
      return;
    }

    const audioTrackPatch: Record<string, unknown> = {};

    if ("approved" in nextPatch) audioTrackPatch.approved = nextPatch.approved;
    if ("featured" in nextPatch) audioTrackPatch.featured = nextPatch.featured;
    if ("trending" in nextPatch) audioTrackPatch.trending = nextPatch.trending;
    if ("approved_source" in nextPatch) audioTrackPatch.approved_source = nextPatch.approved_source;
    if ("moderation_status" in nextPatch) audioTrackPatch.moderation_status = nextPatch.moderation_status;
    if ("copyright_status" in nextPatch) audioTrackPatch.copyright_status = nextPatch.copyright_status;
    if ("tags" in nextPatch) audioTrackPatch.tags = nextPatch.tags;
    if ("mood" in nextPatch) audioTrackPatch.mood = nextPatch.mood;

    if (Object.keys(audioTrackPatch).length > 0) {
      const { error: audioTrackError } = await supabase.from("audio_tracks").update(audioTrackPatch).eq("sound_id", id);

      if (audioTrackError) {
        setErrorMsg(audioTrackError.message);
        await loadLibrary();
      }
    }
  }

  async function togglePreview(sound: CrimsonSound) {
    try {
      const didPlay = await playExclusiveSound(sound, () => setPlayingId(null));
      setPlayingId(didPlay ? sound.id : null);
    } catch {
      setPlayingId(null);
      setErrorMsg("Could not preview this track.");
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Loading Crimson Sounds</p>
        </div>
      </main>
    );
  }

  if (!session?.user || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#e87a82]">Admin</p>
          <h1 className="mt-4 font-serif text-4xl">Sounds are restricted.</h1>
          <Link
            href="/dashboard"
            className="mt-8 inline-flex rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300"
          >
            Back to Feed
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-5 pb-24 pt-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Admin Library</p>
            <h1 className="mt-2 font-serif text-4xl italic">Crimson Sounds</h1>
            <p className="mt-2 text-sm text-zinc-500">{approvedCount} approved soundtracks available to creators.</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-600">Curated by Crimson Society</p>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-zinc-300"
          >
            Admin
          </Link>
        </div>

        {(message || errorMsg) && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm ${
              errorMsg
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {errorMsg || message}
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#e87a82]">Curated soundtrack upload</p>
                <h2 className="mt-2 font-serif text-2xl italic">Create Soundtrack</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Upload cinematic audio for posts, rides, reels, and creator content.
                </p>
              </div>

              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/60"
                >
                  New soundtrack
                </button>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <label
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed p-6 text-center transition ${
                    dragActive ? "border-[#b4141e]/60 bg-[#b4141e]/10" : "border-white/12 bg-black/30"
                  }`}
                >
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/mpeg,audio/mp3,audio/mp4,audio/aac,audio/x-m4a,audio/m4a,audio/wav,audio/x-wav,.mp3,.wav,.m4a,.aac"
                    className="hidden"
                    onChange={handleAudioInput}
                  />
                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-[#e87a82]">
                    Drag & drop soundtrack
                  </div>
                  <p className="mt-4 font-serif text-2xl italic text-white">Upload MP3, WAV, or M4A</p>
                  <p className="mt-2 max-w-md text-sm text-zinc-400">
                    Build a premium underground soundtrack library for Crimson creators. Manual uploads only for beta stability.
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Max {formatFileSize(MAX_AUDIO_FILE_SIZE_BYTES)} · Up to {formatSoundDuration(MAX_AUDIO_DURATION_SECONDS)}
                  </p>
                  {audioFile && <p className="mt-4 text-sm text-emerald-300">Selected: {audioFile.name}</p>}
                </label>

                {uploadProgress > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      <span>Upload progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[#b4141e] transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Title</span>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Artist</span>
                    <input
                      value={form.artist}
                      onChange={(e) => setForm((prev) => ({ ...prev, artist: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Mood</span>
                    <input
                      value={form.mood}
                      onChange={(e) => setForm((prev) => ({ ...prev, mood: e.target.value }))}
                      placeholder="Cinematic, dark, midnight run"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Tags</span>
                    <input
                      value={form.tags}
                      onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                      placeholder="cinematic, reels, night ride"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Duration (seconds)</span>
                    <input
                      value={form.duration}
                      onChange={(e) => setForm((prev) => ({ ...prev, duration: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Category</span>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Cover image</span>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                    className="mt-2 block w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Rights owner</span>
                  <input
                    value={form.rightsOwner}
                    onChange={(e) => setForm((prev) => ({ ...prev, rightsOwner: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">License notes</span>
                  <textarea
                    value={form.licenseNotes}
                    onChange={(e) => setForm((prev) => ({ ...prev, licenseNotes: e.target.value }))}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
                  />
                </label>

                <div className="grid gap-2">
                  {toggleFields.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={form[item.key]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-[#b4141e]"
                      />
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="w-full rounded-full bg-[#b4141e] px-5 py-3 text-xs uppercase tracking-[0.24em] text-white transition hover:bg-[#c91b27] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (form.id ? "Saving..." : "Uploading...") : form.id ? "Save soundtrack" : "Upload soundtrack"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#e87a82]">Library controls</p>
              <h2 className="mt-2 font-serif text-2xl italic">Search & Edit</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Manage curated soundtrack metadata, approval, trending, and featured placement.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search title, artist, mood, tags"
                className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              >
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="featured">Featured</option>
                <option value="trending">Trending</option>
              </select>
            </div>

            {filteredSounds.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
                <p className="font-serif text-xl italic text-white">No soundtracks found.</p>
                <p className="mt-2 text-sm text-white/45">Upload a new soundtrack or adjust your search and filters.</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredSounds.map((sound) => (
                  <div key={sound.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm text-white">{sound.title}</p>
                          {sound.trending && (
                            <span className="rounded-full border border-[#b4141e]/25 bg-[#b4141e]/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[#e87a82]">
                              Trending
                            </span>
                          )}
                          {sound.featured && (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/50">
                              Featured
                            </span>
                          )}
                          {!sound.approved && (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-amber-300">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/40">
                          {sound.artist || "Crimson Society"} · {formatSoundDuration(sound.duration_seconds)} ·{" "}
                          {sound.mood || "No mood"}
                        </p>
                        <p className="mt-2 text-xs text-white/35">{sound.tags || "No tags"}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void togglePreview(sound)}
                          className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/65"
                        >
                          {playingId === sound.id ? "Stop" : "Preview"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(mapSoundToForm(sound))}
                          className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/65"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateSound(sound.id, { approved: !sound.approved })}
                          className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/65"
                        >
                          {sound.approved ? "Unapprove" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateSound(sound.id, { featured: !sound.featured })}
                          className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/65"
                        >
                          {sound.featured ? "Unfeature" : "Feature"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void updateSound(sound.id, { trending: !sound.trending })}
                          className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-white/65"
                        >
                          {sound.trending ? "Untrend" : "Trend"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}