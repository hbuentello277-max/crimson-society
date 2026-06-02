import { NextResponse } from "next/server";
import { isPushDispatchAuthorized } from "@/lib/push/cron-auth";
import { processPendingPushJobs } from "@/lib/push/dispatch";
import { getPushProductionReadiness } from "@/lib/push/production-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function runDispatch(request: Request) {
  if (!isPushDispatchAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const readiness = getPushProductionReadiness();
  if (!readiness.readyForWebPush) {
    return NextResponse.json(
      {
        ok: false,
        error: "Push is not fully configured.",
        missing: readiness.missing,
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(Number(limitParam) || 25, 1), 100) : 50;

  try {
    const results = await processPendingPushJobs(limit);
    const delivered = results.reduce(
      (total, result) => total + (typeof result.sent === "number" ? result.sent : 0),
      0,
    );

    return NextResponse.json({
      ok: true,
      processed: results.length,
      delivered,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push cron dispatch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Vercel Cron invokes GET; webhooks may use POST. */
export async function GET(request: Request) {
  return runDispatch(request);
}

export async function POST(request: Request) {
  return runDispatch(request);
}
