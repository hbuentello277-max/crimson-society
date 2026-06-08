import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createAdminServiceClient } from "@/lib/admin-api";
import { processPendingMediaJobs } from "@/lib/media/process-media-jobs";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ProcessBody = {
  postId?: string | null;
  limit?: number;
};

async function parseBody(request: Request): Promise<ProcessBody> {
  try {
    const json = (await request.json()) as ProcessBody;
    return json || {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const cronAuthorized = isCronAuthorized(request);
  let postId: string | null | undefined;
  let limit = 1;

  if (!cronAuthorized) {
    const auth = await getAuthedSupabaseFromRequest(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await parseBody(request);
    postId = typeof body.postId === "string" ? body.postId.trim() : null;

    if (!postId) {
      return NextResponse.json({ error: "postId is required." }, { status: 400 });
    }

    const { data: post, error } = await auth.supabase
      .from("Posts")
      .select("id, user_id")
      .eq("id", postId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!post || post.user_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: job, error: jobError } = await auth.supabase
      .from("media_processing_jobs")
      .select("id, status, user_id")
      .eq("post_id", postId)
      .eq("user_id", auth.userId)
      .eq("media_kind", "video")
      .in("status", ["queued", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (jobError) {
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json(
        { error: "No pending media job for this post." },
        { status: 404 },
      );
    }

    limit = 1;
  } else {
    const body = await parseBody(request);
    postId = body.postId ?? null;
    limit = body.limit ?? 3;
  }

  try {
    const adminClient = createAdminServiceClient();
    const result = await processPendingMediaJobs(adminClient, {
      limit: Math.min(Math.max(limit, 1), 10),
      postId,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
