"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  fetchApprovedSounds,
  fetchMyFavoriteSoundIds,
  formatSoundDuration,
  getSoundCategoryName,
  getSoundLabel,
  getSoundPlaybackUrl,
  playExclusiveSound,
  stopCrimsonSound,
  type CrimsonSound,
} from "@/lib/sounds";

const RECENT_KEY = "crimson_recent_sound_ids";

function readRecentSoundIds() {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(RECENT_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function rememberSound(id: string) {
  if (typeof window === "undefined") return;
  const next = [id, ...readRecentSoundIds().filter((item) => item !== id)].slice(0, 12);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function SoundArtwork({ sound }: { sound: CrimsonSound }) {
  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#140709]">
      {sound.cover_image_url ? (
        <Image
          src={sound.cover_image_url}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <span className="font-serif text-lg text-[#e87a82]">♪</span>
      )}
    </div>
  );
}

export function CrimsonSoundAttribution({
  sound,
  compact = false,
}: {
  sound: CrimsonSound | null | undefined;
  compact?: boolean;
}) {
  if (!sound) return null;

  return (
    <a
      href={`/sounds/${sound.id}`}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/55 text-white backdrop-blur transition hover:border-[#b4141e]/50 hover:bg-[#b4141e]/10 ${
        compact
          ? "px-2.5 py-1 text-[10px]"
          : "px-3 py-1.5 text-[11px]"
      }`}
    >
      <span className="text-[#e87a82]">♪</span>
      <span className="truncate">{getSoundLabel(sound)}</span>
    </a>
  );
}

export default function CrimsonSoundPicker({
  userId,
  selectedSound,
  onSelect,
  onClose,
}: {
  userId: string | null;
  selectedSound: CrimsonSound | null;
  onSelect: (sound: CrimsonSound | null) => void;
  onClose: () => void;
}) {
  const [sounds, setSounds] = useState<CrimsonSound[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [miniSound, setMiniSound] = useState<CrimsonSound | null>(selectedSound);
  const recentIds = readRecentSoundIds();

  useEffect(() => {
    let cancelled = false;

    async function loadSounds() {
      setLoading(true);
      const [soundResponse, favoriteIds] = await Promise.all([
        fetchApprovedSounds(supabase),
        userId ? fetchMyFavoriteSoundIds(supabase, userId) : Promise.resolve(new Set<string>()),
      ]);

      if (cancelled) return;

      if (!soundResponse.error) {
        setSounds((soundResponse.data as CrimsonSound[]) || []);
      }
      setFavorites(favoriteIds);
      setLoading(false);
    }

    void loadSounds();

    return () => {
      cancelled = true;
      stopCrimsonSound();
    };
  }, [userId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sounds;
    return sounds.filter((sound) =>
      `${sound.title} ${sound.artist || ""} ${sound.mood || ""} ${
        sound.bpm || ""
      } ${getSoundCategoryName(sound)}`
        .toLowerCase()
        .includes(needle),
    );
  }, [query, sounds]);

  const featured = filtered.filter((sound) => sound.featured).slice(0, 8);
  const recent = recentIds
    .map((id) => sounds.find((sound) => sound.id === id))
    .filter(Boolean) as CrimsonSound[];
  const favoritesList = filtered.filter((sound) => favorites.has(sound.id));

  async function togglePreview(sound: CrimsonSound) {
    try {
      const didPlay = await playExclusiveSound(sound, () => setPlayingId(null));
      setPlayingId(didPlay ? sound.id : null);
      setMiniSound(didPlay ? sound : selectedSound);
    } catch {
      setPlayingId(null);
    }
  }

  async function toggleFavorite(sound: CrimsonSound) {
    if (!userId) return;

    const isFavorite = favorites.has(sound.id);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFavorite) next.delete(sound.id);
      else next.add(sound.id);
      return next;
    });

    if (isFavorite) {
      await supabase
        .from("sound_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("sound_id", sound.id);
    } else {
      await supabase
        .from("sound_favorites")
        .upsert({ user_id: userId, sound_id: sound.id }, { onConflict: "user_id,sound_id" });
    }
  }

  function chooseSound(sound: CrimsonSound) {
    rememberSound(sound.id);
    onSelect(sound);
    setMiniSound(sound);
    onClose();
  }

  function renderSound(sound: CrimsonSound) {
    const isSelected = selectedSound?.id === sound.id;
    const isPlaying = playingId === sound.id;
    const canPreview = !!getSoundPlaybackUrl(sound);

    return (
      <div
        key={sound.id}
        className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
          isSelected
            ? "border-[#b4141e]/70 bg-[#b4141e]/12"
            : "border-white/10 bg-white/[0.025]"
        }`}
      >
        <button
          type="button"
          onClick={() => canPreview && togglePreview(sound)}
          disabled={!canPreview}
          className="relative"
          aria-label={isPlaying ? "Pause preview" : "Preview sound"}
        >
          <SoundArtwork sound={sound} />
          <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/35 text-sm text-white">
            {isPlaying ? "Ⅱ" : "▶"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => chooseSound(sound)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm text-white">{sound.title}</p>
          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.16em] text-white/40">
            {sound.artist || "Crimson Society"} · {formatSoundDuration(sound.duration_seconds)}
          </p>
        </button>

        <button
          type="button"
          onClick={() => toggleFavorite(sound)}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
            favorites.has(sound.id)
              ? "border-[#b4141e]/50 bg-[#b4141e]/15 text-[#e87a82]"
              : "border-white/10 text-white/45 hover:border-white/25"
          }`}
          aria-label={favorites.has(sound.id) ? "Remove favorite" : "Favorite sound"}
        >
          {favorites.has(sound.id) ? "♥" : "♡"}
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[86dvh] w-full max-w-2xl overflow-hidden rounded-t-[32px] border-t border-white/10 bg-[#080809]/95 shadow-[0_-30px_80px_-40px_rgba(180,20,30,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#080809]/95 px-5 pb-4 pt-5 backdrop-blur-xl">
          <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-white/20" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                Crimson Sounds
              </p>
              <h2 className="font-serif text-2xl italic text-white">Choose Sound</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/5"
            >
              Done
            </button>
          </div>

          <div className="mt-4 rounded-full border border-white/10 bg-black/50 px-4 py-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sounds"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="max-h-[62dvh] space-y-6 overflow-y-auto px-5 py-5 pb-28">
          {loading && (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-18 animate-pulse rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          )}

          {!loading && sounds.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-center">
              <p className="font-serif text-xl italic text-white">No approved sounds yet.</p>
              <p className="mt-2 text-sm text-white/45">
                Admin-uploaded Crimson Sounds will appear here.
              </p>
            </div>
          )}

          {!loading && recent.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/40">
                Recent
              </p>
              <div className="space-y-2">{recent.slice(0, 4).map(renderSound)}</div>
            </section>
          )}

          {!loading && favoritesList.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/40">
                Favorites
              </p>
              <div className="space-y-2">{favoritesList.slice(0, 6).map(renderSound)}</div>
            </section>
          )}

          {!loading && featured.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/40">
                Featured
              </p>
              <div className="space-y-2">{featured.map(renderSound)}</div>
            </section>
          )}

          {!loading && filtered.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/40">
                Library
              </p>
              <div className="space-y-2">{filtered.map(renderSound)}</div>
            </section>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl border-t border-white/10 bg-[#080809]/95 px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur-xl">
          <div className="flex items-center gap-3 rounded-2xl border border-[#b4141e]/20 bg-[#b4141e]/10 p-3">
            {miniSound ? <SoundArtwork sound={miniSound} /> : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-[#e87a82]">
                ♪
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">
                {miniSound ? getSoundLabel(miniSound) : "No sound selected"}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/40">
                {playingId ? "Preview playing" : "Tap a track to preview"}
              </p>
            </div>
            {selectedSound && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setMiniSound(null);
                  stopCrimsonSound();
                  setPlayingId(null);
                }}
                className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/55"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
