import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPasswordResetRedirectUrl,
  PASSWORD_RESET_PATH,
} from "@/lib/auth/password-reset";
import { resolveAuthCallbackRedirectPath } from "@/lib/auth/post-auth-redirect";

describe("password reset auth helpers", () => {
  it("builds callback URL with reset-password next path", () => {
    const url = buildPasswordResetRedirectUrl("https://crimsonsociety.app");
    assert.equal(
      url,
      "https://crimsonsociety.app/auth/callback?next=%2Freset-password",
    );
  });

  it("prioritizes reset-password over incomplete profile setup", () => {
    const path = resolveAuthCallbackRedirectPath(
      { username: null, display_name: null },
      PASSWORD_RESET_PATH,
    );
    assert.equal(path, PASSWORD_RESET_PATH);
  });

  it("falls back to setup when next is not password reset", () => {
    const path = resolveAuthCallbackRedirectPath(
      { username: null, display_name: null },
      null,
    );
    assert.equal(path, "/profile/setup");
  });
});
