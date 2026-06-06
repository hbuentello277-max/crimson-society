import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { generateNexusCommandSuggestions } from "@/lib/commands/generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await generateNexusCommandSuggestions();

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Command suggestion generation failed",
        evaluated_at: result.evaluated_at,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    evaluated_at: result.evaluated_at,
    drafts_considered: result.drafts_considered,
    commands_created: result.commands_created,
    commands_skipped: result.commands_skipped,
  });
}
