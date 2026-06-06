import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { expireNexusCommands } from "@/lib/commands/expiry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await expireNexusCommands();

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Command expiry failed",
        evaluated_at: result.evaluated_at,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    evaluated_at: result.evaluated_at,
    expired_count: result.expired_count,
  });
}
