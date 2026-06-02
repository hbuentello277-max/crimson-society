import { NextResponse } from "next/server";
import { dispatchPushForNotification, processPendingPushJobs } from "@/lib/push/dispatch";

function isAuthorized(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret) {
    return false;
  }

  const headerSecret = request.headers.get("x-push-dispatch-secret");
  const bearer = request.headers.get("authorization");
  const bearerSecret = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;

  return headerSecret === secret || bearerSecret === secret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    notification_id?: string;
    process_pending?: boolean;
    limit?: number;
  };

  try {
    if (body.process_pending) {
      const results = await processPendingPushJobs(body.limit ?? 25);
      return NextResponse.json({ ok: true, results });
    }

    if (!body.notification_id) {
      return NextResponse.json({ error: "Missing notification_id." }, { status: 400 });
    }

    const result = await dispatchPushForNotification(body.notification_id);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push dispatch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
