"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  ALLOWED_AUDIO_MIME_TYPES,
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

type UploadedAudioAsset = {
  originalBucket: string;
  originalPath: string;
  renderBucket: string;
  renderPath: string;
  publicUrl: string;
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

    if (soundsResponse.error) setErrorMsg(soundsResponse.error.message);
    else setSounds((soundsResponse.data as unknown as CrimsonSound[]) || []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id, isAdmin]);

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
    const { error } = await supabase.storage
      .from(AUDIO_RENDER_BUCKET)
      .upload(path, file, {
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

      const { data: insertedSound, error } = await supabase.from("sounds").insert({
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
      }).select("id").single();

      if (error) throw error;

      if (insertedSound?.id) {
        await supabase.from("audio_tracks").upsert({
          sound_id: insertedSound.id,
          title: form.title.trim(),
          artist: form.artist.trim() || null,
          duration_seconds: detectedDuration,
          category_id: form.categoryId || null,
          mood: form.mood.trim() || null,
          bpm: form.bpm ? Number(form.bpm) : null,
          original_bucket: uploadedAsset?.originalBucket ?? null,
          original_path: uploadedAsset?.originalPath ?? null,
          render_bucket: uploadedAsset?.renderBucket ?? AUDIO_RENDER_BUCKET,
          render_path: uploadedAsset?.renderPath ?? null,
          public_stream_url: audioUrl,
          preview_url: audioUrl,
          cover_image_url: coverImageUrl || null,
          file_size_bytes: audioFile?.size ?? null,
          mime_type: audioFile?.type || null,
          provider: "pixabay",
          import_source_name: "Pixabay Music",
          source_url: form.sourceUrl.trim(),
          license_type: form.licenseType.trim() || "pixabay_content_license",
          rights_owner: form.rightsOwner.trim() || null,
          license_notes: form.licenseNotes.trim() || null,
          approved_source: form.approvedSource,
          copyright_status: form.approvedSource ? "verified" : "needs_review",
          approved: form.approved,
          moderation_status: form.approved ? "approved" : "pending",
          uploaded_by: userId,
        }, { onConflict: "sound_id" });
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
    const nextPatch = {
      ...patch,
      moderation_status:
        patch.approved === true ? "approved" : patch.approved === false ? "pending" : patch.moderation_status,
      copyright_status:
        patch.approved === true ? "verified" : patch.copyright_status,
    };
    setSounds((prev) =>
      prev.map((sound) => (sound.id === id ? { ...sound, ...nextPatch } : sound)),
    );
    const { error } = await supabase.from("sounds").update(nextPatch).eq("id", id);
    await supabase
      .from("audio_tracks")
      .update({
        approved: nextPatch.approved,
        approved_source: nextPatch.approved_source,
        moderation_status: nextPatch.moderation_status,
        copyright_status: nextPatch.copyright_status,
      })
      .eq("sound_id", id);
    if (error) {
      setErrorMsg(error.message);
      await loadLibrary();
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
          <div className="mb-5 rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/10 p-4 text-xs leading-6 text-zinc-300">
            Import only from Pixabay Music. Download the track from Pixabay, keep the
            original Pixabay track URL, upload the MP3/M4A/WAV here, and approve only
            after the source and rights owner are verified. Autoplay stays off; previews
            load only when tapped.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Title
              </span>
              <input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Artist
              </span>
              <input
                value={form.artist}
                onChange={(event) => setForm((prev) => ({ ...prev, artist: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Audio File
              </span>
              <input
                ref={audioInputRef}
                type="file"
                accept=".mp3,.m4a,.aac,.wav,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setErrorMsg("");
                  if (file && !ALLOWED_AUDIO_MIME_TYPES.includes(file.type)) {
                    setAudioFile(null);
                    setErrorMsg("Use MP3, M4A, AAC, or WAV only.");
                    return;
                  }
                  if (file && file.size > MAX_AUDIO_FILE_SIZE_BYTES) {
                    setAudioFile(null);
                    setErrorMsg(`Audio files must stay under ${formatFileSize(MAX_AUDIO_FILE_SIZE_BYTES)}.`);
                    return;
                  }
                  setAudioFile(file);
                }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-[#b4141e] file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-white"
              />
              {audioFile && (
                <span className="mt-2 block text-[11px] text-white/45">
                  {audioFile.name} · {formatFileSize(audioFile.size)}
                </span>
              )}
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Cover Image
              </span>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-[0.18em] file:text-white"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Audio URL
              </span>
              <input
                value={form.audioUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, audioUrl: event.target.value }))}
                placeholder="Optional if uploading a file"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Category
              </span>
              <select
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              >
                <option value="" className="bg-black">
                  Uncategorized
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id} className="bg-black">
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Pixabay Category
              </span>
              <select
                value=""
                onChange={(event) => {
                  const match = categories.find((category) => category.slug === event.target.value);
                  if (match) {
                    const preset = PIXABAY_AUDIO_CATEGORIES.find((category) => category.slug === match.slug);
                    setForm((prev) => ({
                      ...prev,
                      categoryId: match.id,
                      mood: prev.mood || preset?.mood || "",
                    }));
                  }
                }}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              >
                <option value="" className="bg-black">
                  Quick category
                </option>
                {PIXABAY_AUDIO_CATEGORIES.map((category) => (
                  <option key={category.slug} value={category.slug} className="bg-black">
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Duration Seconds
              </span>
              <input
                value={form.duration}
                onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
                inputMode="numeric"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Mood
              </span>
              <input
                value={form.mood}
                onChange={(event) => setForm((prev) => ({ ...prev, mood: event.target.value }))}
                placeholder="Night Ride, Hype, Chill Cruise"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                BPM
              </span>
              <input
                value={form.bpm}
                onChange={(event) => setForm((prev) => ({ ...prev, bpm: event.target.value }))}
                inputMode="numeric"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                License Type
              </span>
              <select
                value={form.licenseType}
                onChange={(event) => setForm((prev) => ({ ...prev, licenseType: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              >
                <option value="app_owned" className="bg-black">
                  App owned
                </option>
                <option value="pixabay_content_license" className="bg-black">
                  Pixabay Content License
                </option>
                <option value="royalty_free" className="bg-black">
                  Royalty free
                </option>
                <option value="cc0" className="bg-black">
                  CC0
                </option>
                <option value="commercial_license" className="bg-black">
                  Commercial license
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Rights Owner
              </span>
              <input
                value={form.rightsOwner}
                onChange={(event) => setForm((prev) => ({ ...prev, rightsOwner: event.target.value }))}
                placeholder="Pixabay artist / contributor"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                Source URL
              </span>
              <input
                value={form.sourceUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, sourceUrl: event.target.value }))}
                placeholder="https://pixabay.com/music/..."
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                License Notes
              </span>
              <input
                value={form.licenseNotes}
                onChange={(event) => setForm((prev) => ({ ...prev, licenseNotes: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-[#b4141e]/60"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={form.approvedSource}
                onChange={(event) => setForm((prev) => ({ ...prev, approvedSource: event.target.checked }))}
              />
              Pixabay source verified
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={form.approved}
                onChange={(event) => setForm((prev) => ({ ...prev, approved: event.target.checked }))}
              />
              Approved
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
              />
              Featured
            </label>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="ml-auto rounded-full bg-[#b4141e] px-5 py-2.5 text-xs uppercase tracking-[0.24em] text-white transition hover:bg-[#d11827] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? "Saving..." : "Add Sound"}
            </button>
          </div>
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
                    aria-label={playingId === sound.id ? "Pause preview" : "Preview sound"}
                  >
                    {playingId === sound.id ? "Ⅱ" : "▶"}
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{sound.title}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      {sound.artist || "Pixabay"} · {formatSoundDuration(sound.duration_seconds)}
                      {sound.bpm ? ` · ${sound.bpm} BPM` : ""} · {sound.usage_count} uses
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex h-8 items-end gap-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  {Array.from({ length: 32 }).map((_, index) => (
                    <span
                      key={index}
                      className="w-full rounded-full bg-[#b4141e]/60"
                      style={{ height: `${20 + ((index * 17) % 78)}%` }}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  {sound.license_type || "pixabay_content_license"} · {sound.rights_owner || "rights owner needed"} ·{" "}
                  {sound.file_size_bytes ? formatFileSize(sound.file_size_bytes) : "external/imported"}
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={!!sound.approved_source}
                  onChange={(event) => updateSound(sound.id, { approved_source: event.target.checked })}
                />
                Source OK
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={sound.approved}
                  onChange={(event) => updateSound(sound.id, { approved: event.target.checked })}
                />
                Approved
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={sound.featured}
                  onChange={(event) => updateSound(sound.id, { featured: event.target.checked })}
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
