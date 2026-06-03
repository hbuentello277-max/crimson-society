"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SavedPost = {
  id: string;
  post_type: "photo" | "reel" | "status" | null;
  caption: string | null;
  status_text?: string | null;
  status_bg?: string | null;
  image_url: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
};

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.025] p-8 text-center shadow-[0_20px_60px_-40px_rgba(0,0,0,0.95)]">
      <div className="mx-auto flex items-center justify-center gap-4">
        <span className="h-px w-10 bg-white/15" />
        <span className="text-[#b4141e]">✦</span>
        <span className="h-px w-10 bg-white/15" />
      </div>
      <p className="mt-5 font-serif text-2xl italic text-zinc-300">{title}</p>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500">{body}</p>
    </div>
  );
}

export function SavedPostsPanel({
  viewerId,
  isOwnProfile,
}: {
  viewerId?: string;
  isOwnProfile: boolean;
}) {
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    if (!viewerId || !isOwnProfile) {
      setPosts([]);
      setLoadingSaved(false);
      return;
    }

    void (async () => {
      setLoadingSaved(true);
      const { data: savedRows } = await supabase
        .from("saved_posts")
        .select("post_id, created_at")
        .eq("user_id", viewerId)
        .order("created_at", { ascending: false })
        .limit(24);

      const postIds = (savedRows || []).map((row) => row.post_id);
      if (postIds.length === 0) {
        setPosts([]);
        setLoadingSaved(false);
        return;
      }

      const { data } = await supabase
        .from("Posts")
        .select(
          "id, post_type, caption, status_text, status_bg, image_url, image_display_url, image_thumbnail_url",
        )
        .in("id", postIds);

      const byId = new Map(((data as SavedPost[]) || []).map((post) => [post.id, post]));
      setPosts(postIds.map((id) => byId.get(id)).filter(Boolean) as SavedPost[]);
      setLoadingSaved(false);
    })();
  }, [isOwnProfile, viewerId]);

  if (!isOwnProfile) {
    return (
      <EmptyPanel
        title="Saved posts are private."
        body="Only the profile owner can view their Saved tab."
      />
    );
  }

  if (loadingSaved) {
    return <p className="px-4 py-8 text-sm text-zinc-500">Loading saved posts…</p>;
  }

  if (posts.length === 0) {
    return (
      <EmptyPanel
        title="No saved posts yet."
        body="Save posts from the feed to collect rides, moments, and rider updates here."
      />
    );
  }

  return (
    <section className="mt-3 grid grid-cols-3 gap-2 px-1 sm:grid-cols-4">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/dashboard?post=${post.id}`}
          className="relative aspect-square overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03]"
        >
          {post.image_display_url || post.image_thumbnail_url || post.image_url ? (
            <Image
              src={post.image_display_url || post.image_thumbnail_url || post.image_url || ""}
              alt={post.caption || "Saved post"}
              fill
              sizes="120px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-3 text-center text-xs text-zinc-500">
              {post.status_text || post.caption || "Saved"}
            </div>
          )}
        </Link>
      ))}
    </section>
  );
}
