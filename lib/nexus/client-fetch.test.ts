import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  fetchNexusClientJson,
  invalidateNexusClientFetchCache,
} from "@/lib/nexus/client-fetch";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  invalidateNexusClientFetchCache();
});

describe("fetchNexusClientJson", () => {
  it("dedupes in-flight requests for the same path", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ ok: true, value: 1 }), { status: 200 });
    }) as typeof fetch;

    const [first, second] = await Promise.all([
      fetchNexusClientJson<{ value: number }>("/api/nexus/metrics"),
      fetchNexusClientJson<{ value: number }>("/api/nexus/metrics"),
    ]);

    assert.equal(calls, 1);
    assert.equal(first.value, 1);
    assert.equal(second.value, 1);
  });

  it("bypasses cache when requested", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response(JSON.stringify({ ok: true, value: calls }), { status: 200 });
    }) as typeof fetch;

    const first = await fetchNexusClientJson<{ value: number }>("/api/nexus/health");
    const second = await fetchNexusClientJson<{ value: number }>("/api/nexus/health", {
      bypassCache: true,
    });

    assert.equal(first.value, 1);
    assert.equal(second.value, 2);
  });
});
