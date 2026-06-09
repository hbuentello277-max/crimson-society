import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

describe("/admin/nexus/voice route", () => {
  it("still renders the unified voice center", () => {
    const pagePath = path.join(process.cwd(), "app/admin/(nexus)/nexus/voice/page.tsx");
    const source = readFileSync(pagePath, "utf8");
    assert.match(source, /LazyNexusVoiceCenter/);
  });

  it("keeps voice API routes available", () => {
    const voiceRoute = path.join(process.cwd(), "app/api/admin/nexus/voice/route.ts");
    const confirmRoute = path.join(process.cwd(), "app/api/admin/nexus/voice/confirm/route.ts");
    assert.match(readFileSync(voiceRoute, "utf8"), /runNexusVoiceAssistant/);
    assert.match(readFileSync(confirmRoute, "utf8"), /confirmNexusVoiceAction/);
  });
});
