"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  AUDIO_ORIGINAL_BUCKET,
  AUDIO_RENDER_BUCKET,
  MAX_AUDIO_DURATION_SECONDS,
  MAX_AUDIO_FILE_SIZE_BYTES,
  PIXABAY_AUDIO_CATEGORIES,
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
  title: string;
  artist: string;
  duration: string;
  mood: string;
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
  licenseNotes: string;
};

type UploadedAudioAsset = {
  originalBucket: string;
  originalPath: string;
  renderBucket: string;
  renderPath: string;
  publicUrl: string;
};

type PixabayTrack = {
  id: number | string;
  name?: string;
  tags?: string;
  user?: string;
  artist?: string;
  duration?: number;
  previewURL?: string;
  audio?: string;
  url?: string;
  pageURL?: string;
  link?: string;
  picture?: string;
  userImageURL?: string;
};

const emptyForm: SoundForm = {
  title: "",
  artist: "",
  duration: "",
  mood: "",
  bpm: "",
  categoryId: "",
  audioUrl: "",
  coverImageUrl: "",
  licenseType: "pixabay_content_license",
  rightsOwner: "",
  sourceUrl: "",
  approvedSource: true,
  featured: false,
  approved: false,
  licenseNotes: "",
};

function fileExt(file: File) {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "bin" : "bin";
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

  const [pixabayQuery, setPixabayQuery] = useState("phonk");
  const [pixabayResults, setPixabayResults] = useState<PixabayTrack[]>([]);
  const [pixabayLoading, setPixabayLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user?.id ?? null;
  const canSave = !!form.title.trim() && !!(form.audioUrl.trim() || audioFile);

  const approvedCount = useMemo(
    () => sounds.filter((sound) => sound.approved && !sound.disabled_at).length,
    [sounds],
  );

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

    void loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, isAdmin]);

  async function searchPixabay() {
    if (!pixabayQuery.trim()) return;

    setPixabayLoading(true);
    setErrorMsg("");
    setMessage("");

    try {
      const res = await fetch(
        `/api/admin/pixabay-search?q=${encodeURIComponent(pixabayQuery.trim())}`,
        { cache: "no-store" },
      );

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Pixabay search failed.");

      setPixabayResults(Array.isArray(json.hits) ? json.hits : []);
    } catch (error) {
      setPixabayResults([]);
      setErrorMsg(error instanceof Error ? error.message : "Pixabay search failed.");
    } finally {
      setPixabayLoading(false);
    }
  }

  function inferCategoryIdFromTrack(track: PixabayTrack) {
    const haystack = `${track.tags || ""} ${track.name || ""}`.toLowerCase();

    const preset = PIXABAY_AUDIO_CATEGORIES.find((category) => {
      const slugWords = category.slug.replace(/-/g, " ");

      return (
        haystack.includes(category.slug) ||
        haystack.includes(slugWords) ||
        haystack.includes(category.name.toLowerCase()) ||
        haystack.includes(category.mood.toLowerCase())
      );
    });

    if (!preset) return null;

    const match = categories.find(
      (category) =>
        category.slug === preset.slug ||
        category.name.toLowerCase() === preset.name.toLowerCase(),
    );

    return match?.id || null;
  }

  async function importPixabayTrack(track: PixabayTrack) {
    setImportingId(String(track.id));
    setErrorMsg("");
    setMessage("");

    try {
      const previewUrl = track.previewURL || track.audio || track.url || null;
      const pageUrl =
        track.pageURL || track.link || `https://pixabay.com/music/${track.id}/`;

      if (!previewUrl) {
        throw new Error("This Pixabay result does not include a playable preview URL.");
      }

      const res = await fetch("/api/admin/pixabay-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixabayId: track.id,
          title: track.name || track.tags || `Pixabay Track ${track.id}`,
          artist: track.user || track.artist || "Pixabay contributor",
          durationSeconds: track.duration || null,
          previewUrl,
          pageUrl,
          coverImageUrl: track.picture || track.userImageURL || null,
          categoryId: inferCategoryIdFromTrack(track),
          mood: (track.tags || "").split(",")[0]?.trim() || null,
          bpm: null,
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Import failed.");

      setMessage(
        json.reused
          ? "Track already existed and is approved."
          : "Pixabay track imported and approved.",
      );

      await loadLibrary();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImportingId(null);
    }
  }

  async function uploadAudioAsset(file: File): Promise<UploadedAudioAsset> {
    if (!isAllowedAudioFile(file)) throw new Error("Use MP3, M4A, AAC, or WAV only.");

    if (isAudioFileTooLarge(file)) {
      throw new Error(
        `Audio files must stay under ${formatFileSize(MAX_AUDIO_FILE_SIZE_BYTES)}.`,
      );
    }

    const duration = await loadAudioDuration(file);

    if (duration > MAX_AUDIO_DURATION_SECONDS) {
      throw new Error(
        `Audio must be ${formatSoundDuration(MAX_AUDIO_DURATION_SECONDS)} or shorter.`,
      );
    }

    const id = crypto.randomUUID();
    const ext = fileExt(file);
    const originalPath = `pixabay/${id}/original.${ext}`;
    const renderPath = `pixabay/${id}/stream.${ext}`;

    const { error: originalError } = await supabase.storage
      .from(AUDIO_ORIGINAL_BUCKET)
      .upload(originalPath, file, {
        cacheControl: "31536000",
        contentType: file.type || undefined,
        upsert: false,
      });

    if (originalError) throw originalError;

    const { error: renderError } = await supabase.storage
      .from(AUDIO_RENDER_BUCKET)
      .upload(renderPath, file, {
        cacheControl: "31536000",
        contentType: file.type || undefined,
        upsert: false,
      });

    if (renderError) throw renderError;

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

    if (error) throw error;

    const { data } = supabase.storage.from(AUDIO_RENDER_BUCKET).getPublicUrl(path);

    return data.publicUrl;
  }

  async function handleSave() {
    if (!userId || !canSave || saving) return;

    setSaving(true);
    setMessage("");
    setErrorMsg("");

    try {
      let audioUrl = form.audioUrl.trim();
      let coverImageUrl = form.coverImageUrl.trim();
      let uploadedAsset: UploadedAudioAsset | null = null;
      let detectedDuration = form.duration ? Number(form.duration) : null;

      if (audioFile) {
        detectedDuration = Math.round(await loadAudioDuration(audioFile));
        uploadedAsset = await uploadAudioAsset(audioFile);
        audioUrl = uploadedAsset.publicUrl;
      }

      if (coverFile) coverImageUrl = await uploadRenderFile(coverFile, "cover");

      if (!audioUrl) throw new Error("Upload the Pixabay audio file before saving.");

      if (!form.sourceUrl.trim().startsWith("https://pixabay.com/music/")) {
        throw new Error("Use the original Pixabay Music track URL as the source URL.");
      }

      if (form.approved && (!form.rightsOwner.trim() || !form.approvedSource)) {
        throw new Error("Approved tracks need a verified source and rights owner.");
      }

      const payload = {
        title: form.title.trim(),
        artist: form.artist.trim() || null,
        duration_seconds: detectedDuration,
        mood: form.mood.trim() || null,
        bpm: form.bpm ? Number(form.bpm) : null,
        category_id: form.categoryId || null,
        audio_url: audioUrl,
        preview_url: audioUrl,
        cover_image_url: coverImageUrl || null,
        uploaded_by: userId,
        provider: "pixabay",
        license_type: form.licenseType.trim() || "pixabay_content_license",
        rights_owner: form.rightsOwner.trim() || null,
        source_url: form.sourceUrl.trim() || null,
        license_notes: form.licenseNotes.trim() || null,
        approved_source: form.approvedSource,
        copyright_status: form.approvedSource ? "verified" : "needs_review",
        moderation_status: form.approved ? "approved" : "pending",
        file_size_bytes: audioFile?.size ?? null,
        mime_type: audioFile?.type || null,
        original_bucket: uploadedAsset?.originalBucket ?? null,
        original_path: uploadedAsset?.originalPath ?? null,
        render_bucket: uploadedAsset?.renderBucket ?? AUDIO_RENDER_BUCKET,
        render_path: uploadedAsset?.renderPath ?? null,
        import_source_name: "Pixabay Music",
        approved: form.approved,
        featured: form.featured,
      };

      const { data: insertedSound, error } = await supabase
        .from("sounds")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      if (insertedSound?.id) {
        await supabase.from("audio_tracks").upsert(
          {
            sound_id: insertedSound.id,
            ...payload,
            public_stream_url: audioUrl,
          },
          { onConflict: "sound_id" },
        );
      }

      setForm(emptyForm);
      setAudioFile(null);
      setCoverFile(null);

      if (audioInputRef.current) audioInputRef.current.value = "";
      if (coverInputRef.current) coverInputRef.current.value = "";

      setMessage("Pixabay track added.");
      await loadLibrary();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not save sound.");
    } finally {
      setSaving(false);
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

    setSounds((prev) =>
      prev.map((sound) =>
        sound.id === id ? { ...sound, ...nextPatch } : sound,
      ),
    );

    const { error } = await supabase.from("sounds").update(nextPatch).eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      await loadLibrary();
      return;
    }

    const audioTrackPatch: Record<string, unknown> = {};

    if ("approved" in nextPatch) audioTrackPatch.approved = nextPatch.approved;
    if ("approved_source" in nextPatch) {
      audioTrackPatch.approved_source = nextPatch.approved_source;
    }
    if ("moderation_status" in nextPatch) {
      audioTrackPatch.moderation_status = nextPatch.moderation_status;
    }
    if ("copyright_status" in nextPatch) {
      audioTrackPatch.copyright_status = nextPatch.copyright_status;
    }

    if (Object.keys(audioTrackPatch).length > 0) {
      await supabase.from("audio_tracks").update(audioTrackPatch).eq("sound_id", id);
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

  useEffect(() => stopCrimsonSound, []);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
            Loading Crimson Sounds
          </p>
        </div>
      </main>
    );
  }

  if (!session?.user || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#e87a82]">
            Admin
          </p>
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
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
              Admin Library
            </p>
            <h1 className="mt-2 font-serif text-4xl italic">Crimson Sounds</h1>
            <p className="mt-2 text-sm text-zinc-500">
              {approvedCount} approved sounds available to members.
            </p>
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

        <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="block flex-1">
                <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                  Import from Pixabay
                </span>
                <input
                  value={pixabayQuery}
                  onChange={(event) => setPixabayQuery(event.target.value)}
                  placeholder="phonk, cinematic, night ride, aggressive, trap, dark, motorcycle"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/60"
                />
              </label>

              <button
                type="button"
                onClick={searchPixabay}
                disabled={pixabayLoading || !pixabayQuery.trim()}
                className="rounded-full bg-emerald-500 px-5 py-3 text-xs uppercase tracking-[0.24em] text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pixabayLoading ? "Searching..." : "Search Pixabay"}
              </button>
            </div>

            <p className="mt-3 text-xs text-zinc-300">
              Search Pixabay Music and import tracks directly into Crimson Sounds.
            </p>

            {pixabayResults.length > 0 && (
              <div className="mt-4 grid gap-3">
                {pixabayResults.map((track) => {
                  const previewUrl =
                    track.previewURL || track.audio || track.url || undefined;
                  const pageUrl =
                    track.pageURL ||
                    track.link ||
                    `https://pixabay.com/music/${track.id}/`;

                  return (
                    <div
                      key={track.id}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">
                            {track.name || track.tags || `Pixabay Track ${track.id}`}
                          </p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                            {track.user || track.artist || "Pixabay contributor"} ·
                            Pixabay
                            {track.duration
                              ? ` · ${formatSoundDuration(track.duration)}`
                              : ""}
                          </p>
                          <a
                            href={pageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs text-emerald-300 underline underline-offset-4"
                          >
                            Open source
                          </a>
                        </div>

                        {previewUrl ? (
                          <audio
                            controls
                            preload="none"
                            src={previewUrl}
                            className="w-full md:w-72"
                          />
                        ) : (
                          <p className="text-xs text-red-300">No preview URL</p>
                        )}

                        <button
                          type="button"
                          onClick={() => importPixabayTrack(track)}
                          disabled={importingId === String(track.id) || !previewUrl}
                          className="rounded-full bg-[#b4141e] px-5 py-2.5 text-xs uppercase tracking-[0.24em] text-white transition hover:bg-[#d11827] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {importingId === String(track.id) ? "Importing..." : "Import"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Track title"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />

            <input
              value={form.artist}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, artist: event.target.value }))
              }
              placeholder="Artist / rights owner"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />

            <input
              value={form.sourceUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))
              }
              placeholder="Original Pixabay music URL"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none md:col-span-2"
            />

            <input
              value={form.audioUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, audioUrl: event.target.value }))
              }
              placeholder="Audio URL, or upload file below"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none md:col-span-2"
            />

            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />

            <select
              value={form.categoryId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, categoryId: event.target.value }))
              }
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <input
              value={form.duration}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, duration: event.target.value }))
              }
              placeholder="Duration seconds"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />

            <input
              value={form.mood}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, mood: event.target.value }))
              }
              placeholder="Mood"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />

            <input
              value={form.bpm}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, bpm: event.target.value }))
              }
              placeholder="BPM"
              className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-xs text-zinc-300">
            <label>
              <input
                type="checkbox"
                checked={form.approvedSource}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    approvedSource: event.target.checked,
                  }))
                }
              />{" "}
              Source verified
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.approved}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, approved: event.target.checked }))
                }
              />{" "}
              Approved
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, featured: event.target.checked }))
                }
              />{" "}
              Featured
            </label>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="mt-6 rounded-full bg-[#b4141e] px-6 py-3 text-xs uppercase tracking-[0.24em] text-white transition hover:bg-[#d11827] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Sound"}
          </button>
        </section>

        <section className="mt-8 space-y-3">
          {sounds.map((sound) => (
            <div
              key={sound.id}
              className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4 md:grid-cols-[1fr_auto_auto_auto]"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePreview(sound)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#b4141e]/30 bg-[#b4141e]/10 text-xs text-white"
                  >
                    {playingId === sound.id ? "Ⅱ" : "▶"}
                  </button>

                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{sound.title}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      {sound.artist || "Pixabay"} ·{" "}
                      {formatSoundDuration(sound.duration_seconds)}
                      {sound.bpm ? ` · ${sound.bpm} BPM` : ""} ·{" "}
                      {sound.usage_count} uses
                    </p>
                  </div>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={!!sound.approved_source}
                  onChange={(event) =>
                    updateSound(sound.id, { approved_source: event.target.checked })
                  }
                />
                Source OK
              </label>

              <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={sound.approved}
                  onChange={(event) =>
                    updateSound(sound.id, { approved: event.target.checked })
                  }
                />
                Approved
              </label>

              <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={sound.featured}
                  onChange={(event) =>
                    updateSound(sound.id, { featured: event.target.checked })
                  }
                />
                Featured
              </label>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}