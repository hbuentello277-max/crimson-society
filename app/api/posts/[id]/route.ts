import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminServiceClient } from "@/lib/admin-api";
import { purgePostMediaAndJobs } from "@/lib/posts/delete-post-media";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POST_MEDIA_SELECT =
  "id, user_id, image_original_path, video_original_path, image_display_url, image_thumbnail_url, video_playback_url, video_hls_url, video_thumbnail_url";

async function isActiveAdmin(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, is_admin")
    .eq("id", userId)
    .maybeSingle();

  return (
    profile?.status === "active" &&
    (profile.role === "admin" || profile.is_admin === true)
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthedSupabaseFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Post id is required." }, { status: 400 });
  }

  const { data: post, error: fetchError } = await auth.supabase
    .from("Posts")
    .select(POST_MEDIA_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const admin = await isActiveAdmin(auth.supabase, auth.userId);
  if (post.user_id !== auth.userId && !admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminServiceClient();
  const { storageErrors } = await purgePostMediaAndJobs(adminClient, post);

  let deleteQuery = auth.supabase.from("Posts").delete().eq("id", id);
  if (!admin) {
    deleteQuery = deleteQuery.eq("user_id", auth.userId);
  }

  const { error: deleteError } = await deleteQuery;
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    storageErrors,
  });
}
