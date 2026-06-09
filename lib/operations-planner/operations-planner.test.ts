import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvePlanTypeFromTranscript } from "@/lib/operations-planner/plan-builder";
import { estimatePlanConfidence, estimatePlanImpact } from "@/lib/operations-planner/impact-estimator";
import { priorityScore, resolvePlanPriority } from "@/lib/operations-planner/prioritization";
import { PLAN_TEMPLATES, templateStepsForType } from "@/lib/operations-planner/templates";
import { OPERATIONS_PLAN_TYPES } from "@/lib/operations-planner/types";
import { resolveNexusVoiceTool } from "@/lib/admin/nexus-voice/routing";

describe("plan type resolution", () => {
  it("maps growth, revenue, membership, launch, and incident phrases", () => {
    assert.equal(resolvePlanTypeFromTranscript("Build a launch plan."), "launch");
    assert.equal(resolvePlanTypeFromTranscript("Build a revenue recovery plan."), "revenue");
    assert.equal(resolvePlanTypeFromTranscript("Build an incident response plan."), "incident");
    assert.equal(resolvePlanTypeFromTranscript("What should we do about Blackcard growth?"), "membership");
    assert.equal(resolvePlanTypeFromTranscript("Generate a founder action plan."), "growth");
  });
});

describe("plan templates", () => {
  it("defines all five plan types with steps and drafts", () => {
    for (const planType of OPERATIONS_PLAN_TYPES) {
      assert.ok(PLAN_TEMPLATES[planType].title);
      assert.ok(templateStepsForType(planType).length >= 3);
      assert.ok(PLAN_TEMPLATES[planType].suggested_drafts.length >= 2);
    }
  });
});

describe("prioritization", () => {
  it("prioritizes incident and revenue plans higher", () => {
    assert.equal(resolvePlanPriority({ planType: "incident", openIncidents: 1 }), "critical");
    assert.equal(resolvePlanPriority({ planType: "revenue", riskImpact: 90 }), "high");
    assert.equal(resolvePlanPriority({ planType: "launch", launchScore: 65 }), "high");
    assert.equal(priorityScore("critical") > priorityScore("medium"), true);
  });
});

describe("impact estimator", () => {
  it("returns bounded confidence and impact scores", () => {
    const confidence = estimatePlanConfidence({ signalCount: 4, partial: false });
    const impact = estimatePlanImpact({
      planType: "revenue",
      confidence,
      riskImpact: 88,
    });
    assert.ok(confidence >= 60 && confidence <= 100);
    assert.ok(impact >= 70 && impact <= 100);
  });
});

describe("voice routing", () => {
  it("routes operations planner commands", () => {
    assert.equal(resolveNexusVoiceTool("Create an operations plan."), "generateOperationsPlan");
    assert.equal(resolveNexusVoiceTool("Build a launch plan."), "generateOperationsPlan");
    assert.equal(resolveNexusVoiceTool("Build a revenue recovery plan."), "generateOperationsPlan");
    assert.equal(resolveNexusVoiceTool("What should happen next?"), "generateOperationsPlan");
    assert.equal(resolveNexusVoiceTool("Create action plan draft."), "createOperationsPlanActionDrafts");
  });
});

describe("action center integration", () => {
  it("includes suggested action drafts for each plan template", () => {
    for (const planType of OPERATIONS_PLAN_TYPES) {
      const drafts = PLAN_TEMPLATES[planType].suggested_drafts;
      assert.ok(drafts.every((draft) => draft.action_type && draft.title));
      assert.equal(typeof planType, "string");
    }
  });
});
