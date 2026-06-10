import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";
import { buildAutomationStudioActionDraft } from "@/lib/admin/nexus-voice/automation-studio-tools";
import {
  canEvaluateAutomationRules,
  canMutateAutomationRules,
} from "@/lib/automation-studio/permissions";
import {
  assertSafeAutomationOutputs,
  automationOutputsAreDraftOnly,
  FORBIDDEN_AUTOMATION_OUTPUT_KINDS,
} from "@/lib/automation-studio/safety";
import {
  AUTOMATION_RULE_TEMPLATES,
  buildRuleInputFromTemplate,
  getAutomationTemplate,
} from "@/lib/automation-studio/templates";
import { NEXUS_AUTOMATION_STUDIO_PHASE } from "@/lib/automation-studio/types";
import {
  parseAutomationStatusChange,
  parseAutomationTemplateId,
} from "@/lib/automation-studio/voice";
import { NEXUS_CURRENT_PHASE } from "@/lib/executive-command/types";
import { resolveVoiceCommand } from "@/lib/nexus/voice-commands";

describe("automation studio phase", () => {
  it("exposes phase 16 constants", () => {
    assert.equal(NEXUS_AUTOMATION_STUDIO_PHASE, 16);
    assert.equal(NEXUS_CURRENT_PHASE, 16);
  });

  it("loads AutomationStudioCenter on the automation studio route", () => {
    const pagePath = path.join(
      process.cwd(),
      "app/admin/(nexus)/nexus/automation-studio/page.tsx",
    );
    const lazyPath = path.join(process.cwd(), "lib/nexus/lazy-centers.tsx");
    const pageSource = readFileSync(pagePath, "utf8");
    const lazySource = readFileSync(lazyPath, "utf8");

    assert.match(pageSource, /LazyNexusAutomationStudioCenter/);
    assert.match(lazySource, /automation-studio\/AutomationStudioCenter/);
  });
});

describe("automation templates", () => {
  it("defines the five founder automation examples", () => {
    assert.equal(AUTOMATION_RULE_TEMPLATES.length, 5);
    assert.ok(getAutomationTemplate("blackcard_growth"));
    assert.ok(getAutomationTemplate("launch_protection"));
    assert.ok(getAutomationTemplate("shop_inventory"));
    assert.ok(getAutomationTemplate("community_growth"));
    assert.ok(getAutomationTemplate("platform_risk"));
  });

  it("builds draft rule input with template_id in condition_config", () => {
    const input = buildRuleInputFromTemplate("launch_protection");
    assert.ok(input);
    assert.equal(input?.condition_type, "launch_readiness_below");
    assert.equal(input?.condition_config?.template_id, "launch_protection");
    assert.equal(input?.status, "draft");
  });
});

describe("safety restrictions", () => {
  it("allows only draft output kinds", () => {
    const outputs = AUTOMATION_RULE_TEMPLATES[0]?.output_config.outputs ?? [];
    assert.doesNotThrow(() => assertSafeAutomationOutputs(outputs));
    assert.equal(automationOutputsAreDraftOnly(outputs), true);
  });

  it("blocks forbidden output kinds", () => {
    for (const kind of FORBIDDEN_AUTOMATION_OUTPUT_KINDS) {
      assert.throws(
        () =>
          assertSafeAutomationOutputs([
            { kind } as unknown as { kind: "action_draft"; action_type: "weekly_report" },
          ]),
        /Forbidden automation output kind/,
      );
    }
  });

  it("blocks execution language in output specs", () => {
    assert.throws(
      () =>
        assertSafeAutomationOutputs([
          {
            kind: "action_draft",
            action_type: "weekly_report",
            transcript: "Please execute this immediately",
          },
        ]),
      /forbidden execution language/i,
    );
  });
});

describe("permissions", () => {
  it("allows only owners to mutate or evaluate rules", () => {
    assert.equal(canMutateAutomationRules("owner"), true);
    assert.equal(canMutateAutomationRules("admin"), false);
    assert.equal(canEvaluateAutomationRules("owner"), true);
    assert.equal(canEvaluateAutomationRules("admin"), false);
  });
});

describe("voice routing", () => {
  it("navigates to Automation Studio", () => {
    assert.equal(resolveVoiceCommand("open automation studio")?.href, "/admin/nexus/automation-studio");
    assert.equal(resolveVoiceCommand("show automations")?.href, "/admin/nexus/automation-studio");
  });

  it("routes automation studio tools", () => {
    assert.equal(resolveNexusVoiceTool("What automations triggered?"), "getAutomationTriggered");
    assert.equal(resolveNexusVoiceTool("Create automation"), "prepareAutomationRuleDraft");
    assert.equal(
      resolveNexusVoiceTool("Create Blackcard growth automation"),
      "prepareAutomationRuleDraft",
    );
    assert.equal(
      resolveNexusVoiceTool("Create launch protection automation"),
      "prepareAutomationRuleDraft",
    );
    assert.equal(resolveNexusVoiceTool("Create shop automation"), "prepareAutomationRuleDraft");
    assert.equal(resolveNexusVoiceTool("Pause automation"), "updateAutomationRuleStatus");
    assert.equal(resolveNexusVoiceTool("Enable automation"), "updateAutomationRuleStatus");
    assert.equal(resolveNexusVoiceTool("Disable automation"), "updateAutomationRuleStatus");
  });

  it("parses template and status intents for confirmation drafts", () => {
    assert.equal(parseAutomationTemplateId("Create Blackcard growth automation"), "blackcard_growth");
    assert.equal(parseAutomationTemplateId("Create launch protection automation"), "launch_protection");
    assert.equal(parseAutomationStatusChange("Pause automation")?.status, "paused");
    assert.equal(parseAutomationStatusChange("Enable automation")?.status, "active");

    const draft = buildAutomationStudioActionDraft(
      "prepareAutomationRuleDraft",
      "Create shop automation",
    );
    assert.equal(draft.draft.template_id, "shop_inventory");
    assert.match(draft.summary, /Shop Automation/i);
  });
});

describe("vercel hobby cron compatibility", () => {
  it("does not register automation studio sub-daily crons", () => {
    const vercel = JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")) as {
      crons?: Array<{ path: string; schedule: string }>;
    };
    const automationCrons = (vercel.crons ?? []).filter((entry) =>
      entry.path.includes("automation-studio"),
    );
    assert.equal(automationCrons.length, 0);
  });
});
