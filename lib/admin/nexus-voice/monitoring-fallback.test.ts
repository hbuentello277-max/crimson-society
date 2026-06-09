import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCheckoutHealth, getNexusSystemHealth } from "@/lib/admin/nexus-voice/monitoring-tools";

function missingTableAdmin() {
  const missingError = {
    code: "PGRST205",
    message: "Could not find the table public.nexus_integrations in the schema cache",
  };

  function buildQuery() {
    const response = Promise.resolve({ data: null, error: missingError, count: null });
    const query = {
      select() {
        return query;
      },
      eq() {
        return query;
      },
      in() {
        return query;
      },
      gte() {
        return query;
      },
      order() {
        return query;
      },
      limit() {
        return response;
      },
      then<TResult1 = { data: null; error: typeof missingError; count: null }, TResult2 = never>(
        onfulfilled?: ((value: { data: null; error: typeof missingError; count: null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        return response.then(onfulfilled, onrejected);
      },
    };

    return query;
  }

  return {
    from() {
      return buildQuery();
    },
  };
}

describe("monitoring fallback behavior", () => {
  it("returns partial checkout health when shop tables are unavailable", async () => {
    const result = await getCheckoutHealth(missingTableAdmin() as never);
    assert.equal(result.partial, true);
    assert.equal(result.data.status, "unknown");
    assert.ok(result.warnings && result.warnings.length > 0);
  });

  it("returns partial nexus system health when integration tables are unavailable", async () => {
    const result = await getNexusSystemHealth(missingTableAdmin() as never);
    assert.equal(result.partial, true);
    assert.equal(result.data.status, "unknown");
    assert.ok(result.warnings && result.warnings.length > 0);
  });
});
