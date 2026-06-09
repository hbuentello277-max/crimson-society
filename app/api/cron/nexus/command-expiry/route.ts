import { expireNexusCommands } from "@/lib/commands/expiry";
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

  return runNexusCronRoute("command_expiry", async () => {
    const result = await expireNexusCommands();
    if (!result.ok) {
      throw new NexusCronJobError(result.error ?? "Command expiry failed");
    }

    return {
      body: {
        evaluated_at: result.evaluated_at,
        expired_count: result.expired_count,
      },
      details: {
        expired_count: result.expired_count,
      },
    };
  });
}
