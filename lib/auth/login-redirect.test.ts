import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLoginRedirectPath } from "@/lib/auth/login-redirect";

describe("buildLoginRedirectPath", () => {
  it("preserves inbox conversation deep links", () => {
    assert.equal(
      buildLoginRedirectPath("/inbox?conversation=conv-abc"),
      "/login?next=%2Finbox%3Fconversation%3Dconv-abc",
    );
  });

  it("rejects unsafe external redirects", () => {
    assert.equal(
      buildLoginRedirectPath("https://evil.example/phish"),
      "/login?next=%2Fdashboard",
    );
  });
});
