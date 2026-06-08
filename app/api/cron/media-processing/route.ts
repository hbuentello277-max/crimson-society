import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { createAdminServiceClient } from "@/lib/admin-api";
import { processPendingMediaJobs } from "@/lib/media/process-media-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function runProcessing(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 3, 1), 10) : 3;

  try {
    const adminClient = createAdminServiceClient();
    const result = await processPendingMediaJobs(adminClient, { limit });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media processing cron failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return runProcessing(request);
}

export async function POST(request: Request) {
  return runProcessing(request);
}
