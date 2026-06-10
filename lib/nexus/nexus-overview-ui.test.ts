import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { explainPlatformStatusMismatch } from "@/lib/nexus/platform-status-display";
import {
  NEXUS_PRIMARY_NAV,
  NEXUS_SYSTEMS_DIRECTORY,
  isPrimaryNavActive,
} from "@/lib/nexus/systems-directory";

describe("primary navigation", () => {
  it("exposes five founder destinations", () => {
    assert.equal(NEXUS_PRIMARY_NAV.length, 5);
    assert.deepEqual(
      NEXUS_PRIMARY_NAV.map((item) => item.label),
      ["Overview", "Copilot", "Automation", "Action Center", "Intelligence"],
    );
  });

  it("highlights overview on founder home and overview routes", () => {
    const overview = NEXUS_PRIMARY_NAV[0];
    assert.equal(isPrimaryNavActive("/admin/nexus", overview), true);
    assert.equal(isPrimaryNavActive("/admin/nexus/overview", overview), true);
    assert.equal(isPrimaryNavActive("/admin/nexus/copilot", overview), false);
  });

  it("keeps all systems reachable via NEXUS Systems directory", () => {
    const hrefs = new Set<string>();
    for (const category of NEXUS_SYSTEMS_DIRECTORY) {
      for (const item of category.items) {
        hrefs.add(item.href);
      }
    }
    assert.ok(hrefs.has("/admin/nexus/mission-control"));
    assert.ok(hrefs.has("/admin/nexus/mission-health"));
    assert.ok(hrefs.has("/admin/nexus/automation-studio"));
    assert.ok(hrefs.has("/admin/nexus/memory"));
  });
});

describe("platform status explanation", () => {
  it("explains At Risk when incidents exist despite high health score", () => {
    const explanation = explainPlatformStatusMismatch({
      platformStatusLabel: "At Risk",
      platformHealthScore: 100,
      openIncidents: 1,
      openAlerts: 0,
      criticalAlerts: 0,
      failedJobs: 0,
      degradedWorkflows: 0,
      workflowHealthScore: 100,
    });
    assert.ok(explanation?.includes("open incident"));
    assert.ok(explanation?.includes("Platform Health"));
  });

  it("explains strategic scoring when signals look clean", () => {
    const explanation = explainPlatformStatusMismatch({
      platformStatusLabel: "At Risk",
      platformHealthScore: 100,
      openIncidents: 0,
      openAlerts: 0,
      criticalAlerts: 0,
      failedJobs: 0,
      degradedWorkflows: 0,
      workflowHealthScore: 100,
    });
    assert.ok(explanation?.includes("strategic"));
  });
});

describe("overview UI structure", () => {
  it("uses collapsed expanded labels in NexusDensePanel", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/nexus/NexusCommandUI.tsx"),
      "utf8",
    );
    assert.match(source, /▶ Collapsed/);
    assert.match(source, /▼ Expanded/);
  });

  it("does not modify FounderHero", () => {
    const source = readFileSync(
      path.join(process.cwd(), "components/nexus/founder/FounderHero.tsx"),
      "utf8",
    );
    assert.match(source, /NexusRing/);
    assert.match(source, /buildOrbitMetrics/);
  });

  it("loads simplified shell navigation", () => {
    const source = readFileSync(path.join(process.cwd(), "components/nexus/NexusShell.tsx"), "utf8");
    assert.match(source, /NEXUS_PRIMARY_NAV/);
    assert.match(source, /NexusSystemsDirectory/);
    assert.doesNotMatch(source, /assertNavOrder/);
  });
});
