import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveManeuverArrow } from "@/lib/meets/navigation/maneuver-arrow";
import type { NavigationStep } from "@/lib/meets/navigation/types";

function step(partial: Partial<NavigationStep>): NavigationStep {
  return {
    id: "step-1",
    instruction: "Turn left",
    distanceMeters: 100,
    durationSeconds: 30,
    maneuverType: null,
    maneuverModifier: null,
    maneuverLocation: null,
    stepGeometry: [],
    routePointIndexStart: 0,
    routePointIndexEnd: 1,
    ...partial,
  };
}

describe("resolveManeuverArrow", () => {
  it("maps left maneuvers to a left arrow", () => {
    assert.equal(resolveManeuverArrow(step({ maneuverModifier: "left" })), "←");
  });

  it("maps right maneuvers to a right arrow", () => {
    assert.equal(resolveManeuverArrow(step({ maneuverModifier: "sharp right" })), "→");
  });
});
