"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CrimsonSoundAttribution } from "@/components/CrimsonSoundPicker";
import { useAuth } from "@/components/AuthProvider";
import { getBestImageUrl } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import {
  formatSoundDuration,
  getSoundPlaybackUrl,
  playExclusiveSound,
  stopCrimsonSound,
  type CrimsonSound,
} from "@/lib/sounds";

type SoundPost = {
  id: string;
  post_id: string;
  sounds: CrimsonSound | CrimsonSound[] | null;
  Posts: {
    id: string;
    caption: string | null;
    image_url: string | null;
    image_display_url: string | null;
    image_thumbnail_url: string | null;
    video_thumbnail_url: string | null;
    post_type: string | null;
    created_at: string | null;
  } | {
    id: string;
    caption: string | null;
    image_url: string | null;
    image_display_url: string | null;
    image_thumbnail_url: string | null;
    video_thumbnail_url: string | null;
    post_type: string | null;
    created_at: string | null;
  }[] | null;
};

function pickPost(postInput: SoundPost["Posts"]) {
  if (Array.isArray(postInput)) return postInput[0] ?? null;
  return postInput ?? null;
}

export default function SoundDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [sound, setSound] = useState<CrimsonSound | null>(null);
  const [posts, setPosts] = useState<SoundPost[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace("/login");
  }, [loading, router, session]);

  useEffect(() => {
    let cancelled = false;

    async function loadSound() {
      if (!session || !params.id) return;
      setPageLoading(true);

      const [soundResponse, postsResponse] = await Promise.all([
        supabase
          .from("sounds")
          .select(
            "id, title, artist, duration_seconds, mood, bpm, cover_image_url, audio_url, preview_url, license_type, rights_owner, source_url, approved, featured, usage_count, category_id, created_at",
          )
          .eq("id", params.id)
          .eq("approved", true)
          .is("disabled_at", null)
          .maybeSingle(),
        supabase
          .from("post_sounds")
          .select(
            `
            id,
            post_id,
            sounds (
              id,
              title,
              artist,
              duration_seconds,
              mood,
              bpm,
              cover_image_url,
              audio_url,
              preview_url,
              license_type,
              rights_owner,
              source_url,
              approved,
              featured,
              usage_count,
              category_id,
              created_at
            ),
            Posts (
              id,
              caption,
              image_url,
              image_display_url,
              image_thumbnail_url,
              video_thumbnail_url,
              post_type,
              created_at
            )
          `,
          )
          .eq("sound_id", params.id)
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      setSound((soundResponse.data as unknown as CrimsonSound | null) ?? null);
      setPosts((postsResponse.data as unknown as SoundPost[]) || []);
      setPageLoading(false);
    }

    void loadSound();

    return () => {
      cancelled = true;
      stopCrimsonSound();
    };
  }, [params.id, session]);

  async function togglePreview() {
    if (!sound || !getSoundPlaybackUrl(sound)) return;

    try {
      const didPlay = await playExclusiveSound(sound, () => setPlaying(false));
      setPlaying(didPlay);
    } catch {
      setPlaying(false);
    }
  }

  if (loading || pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] text-white">
        <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
          Loading sound
        </p>
      </main>
    );
  }

  if (!session) return null;

  if (!sound) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#e87a82]">
            Crimson Sounds
          </p>
          <h1 className="mt-4 font-serif text-4xl">Sound unavailable.</h1>
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
    <main className="min-h-screen bg-[#050505] px-5 pb-28 pt-8 text-white">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.22em] text-zinc-300"
        >
          Back
        </button>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-b from-[#101012] to-[#070707] p-5">
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[26px] border border-[#b4141e]/30 bg-[#140709]">
              {sound.cover_image_url ? (
                <Image
                  src={sound.cover_image_url}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-serif text-3xl text-[#e87a82]">
                  ♪
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">
                Crimson Sound
              </p>
              <h1 className="mt-2 truncate font-serif text-3xl text-white">
                {sound.title}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                {sound.artist || "Crimson Society"} · {formatSoundDuration(sound.duration_seconds)}
                {sound.bpm ? ` · ${sound.bpm} BPM` : ""}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePreview}
              className="rounded-full bg-[#b4141e] px-5 py-2.5 text-xs uppercase tracking-[0.24em] text-white shadow-[0_0_24px_rgba(180,20,30,0.35)]"
            >
              {playing ? "Stop" : "Preview"}
            </button>
            <CrimsonSoundAttribution sound={sound} />
          </div>
        </section>

        <section className="mt-8">
          <p className="mb-4 text-[10px] uppercase tracking-[0.35em] text-zinc-500">
            Posts using this sound
          </p>
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center">
              <p className="font-serif text-xl italic text-zinc-300">
                No posts have used this sound yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {posts.map((item) => {
                const post = pickPost(item.Posts);
                const image = post
                  ? getBestImageUrl(
                      post.image_thumbnail_url || post.image_display_url || post.video_thumbnail_url,
                      post.image_url,
                      "profileGrid",
                    )
                  : "";

                return (
                  <div
                    key={item.id}
                    className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={post?.caption || "Crimson Society post"}
                        fill
                        sizes="(max-width: 768px) 50vw, 320px"
                        quality={90}
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">
                        {post?.post_type === "reel" ? "Reel processing" : "Post"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
