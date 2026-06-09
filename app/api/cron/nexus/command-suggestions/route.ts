import { generateNexusCommandSuggestions } from "@/lib/commands/generator";
import {
  assertNexusCronAuthorized,
  NexusCronJobError,
  nexusCronUnauthorizedResponse,
  runNexusCronRoute,
} from "@/lib/nexus/cron-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!assertNexusCronAuthorized(request)) {
    return nexusCronUnauthorizedResponse();
  }

  return runNexusCronRoute("command_suggestions", async () => {
    const result = await generateNexusCommandSuggestions();
    if (!result.ok) {
      throw new NexusCronJobError(result.error ?? "Command suggestion generation failed");
    }

    return {
      body: {
        evaluated_at: result.evaluated_at,
        drafts_considered: result.drafts_considered,
        commands_created: result.commands_created,
        commands_skipped: result.commands_skipped,
      },
      details: {
        drafts_considered: result.drafts_considered,
        commands_created: result.commands_created,
        commands_skipped: result.commands_skipped,
      },
    };
  });
}
