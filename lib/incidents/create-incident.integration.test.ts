import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildIncidentIdempotencyKey } from "./idempotency";
import { executeTransactionalIncidentCreate } from "./transactional-create";
import type { EscalationAlertRow } from "./types";

type StoreAlert = {
  id: string;
  incident_id: string | null;
  status: string;
};

type StoreIncident = {
  id: string;
  title: string;
  status: string;
  severity: string;
  metadata: Record<string, unknown>;
  timeline: Array<Record<string, unknown>>;
};

function makeAlert(id: string): EscalationAlertRow {
  return {
    id,
    rule_id: "health.integration.down",
    category: "infra",
    severity: "critical",
    status: "active",
    title: `Integration down ${id}`,
    message: "test",
    dedupe_key: `rule:integration:${id}`,
    incident_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: { impact_score: 88, first_seen_at: new Date().toISOString(), evidence: {} },
  };
}

function createMockAdmin(input: {
  simulateLinkFailureOnAttempt?: number;
}): {
  admin: SupabaseClient;
  incidents: Map<string, StoreIncident>;
  alerts: Map<string, StoreAlert>;
} {
  const incidents = new Map<string, StoreIncident>();
  const alerts = new Map<string, StoreAlert>();
  let rpcAttempts = 0;
  let incidentCounter = 0;

  alerts.set("alert-1", { id: "alert-1", incident_id: null, status: "active" });

  const admin = {
    rpc: async (fn: string, params: Record<string, unknown>) => {
      if (fn !== "nexus_create_incident_from_alerts") {
        return { data: null, error: { message: "unknown rpc" } };
      }

      rpcAttempts += 1;
      const alertIds = params.p_alert_ids as string[];

      if (input.simulateLinkFailureOnAttempt === rpcAttempts) {
        return {
          data: {
            ok: false,
            error: "incident_link_failed: expected 1, linked 0",
            code: "incident_link_failed",
          },
          error: null,
        };
      }

      const idempotencyKey = params.p_idempotency_key as string;
      for (const existing of incidents.values()) {
        if (
          existing.metadata.idempotency_key === idempotencyKey &&
          ["open", "investigating", "mitigated"].includes(existing.status)
        ) {
          return {
            data: {
              ok: true,
              created: false,
              incident_id: existing.id,
              idempotent: true,
            },
            error: null,
          };
        }
      }

      for (const alertId of alertIds) {
        const row = alerts.get(alertId);
        if (!row || row.incident_id) {
          return {
            data: {
              ok: false,
              error: `alert_not_linkable:${alertId}`,
              code: "alert_not_linkable",
            },
            error: null,
          };
        }
      }

      incidentCounter += 1;
      const incidentId = `incident-${incidentCounter}`;
      incidents.set(incidentId, {
        id: incidentId,
        title: params.p_title as string,
        status: "open",
        severity: params.p_severity as string,
        metadata: (params.p_metadata as Record<string, unknown>) ?? {},
        timeline: (params.p_timeline as Array<Record<string, unknown>>) ?? [],
      });

      for (const alertId of alertIds) {
        const row = alerts.get(alertId)!;
        row.incident_id = incidentId;
      }

      return {
        data: {
          ok: true,
          created: true,
          incident_id: incidentId,
          idempotent: false,
        },
        error: null,
      };
    },
    from: (table: string) => ({
      select: () => ({
        eq: (col: string, val: string) => ({
          maybeSingle: async () => {
            if (table === "nexus_incidents" && col === "id") {
              const row = incidents.get(val);
              if (!row) {
                return { data: null, error: null };
              }
              return {
                data: {
                  ...row,
                  integration_id: null,
                  started_at: new Date().toISOString(),
                  resolved_at: null,
                  root_cause: null,
                  impact_summary: null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              };
            }
            return { data: null, error: null };
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  return { admin, incidents, alerts };
}

describe("incident transactional create", () => {
  it("builds stable idempotency keys regardless of alert order", () => {
    const a = buildIncidentIdempotencyKey(["b", "a", "a"]);
    const b = buildIncidentIdempotencyKey(["a", "b"]);
    assert.equal(a, b);
    assert.equal(a, "alerts:a:b");
  });

  it("simulated link failure leaves no orphan incident; retry creates exactly one", async () => {
    const harness = createMockAdmin({ simulateLinkFailureOnAttempt: 1 });
    const alert = makeAlert("alert-1");

    const first = await executeTransactionalIncidentCreate(harness.admin, {
      alerts: [alert],
      reason: "critical_high_impact",
    });

    assert.equal(first.ok, false);
    assert.equal(harness.incidents.size, 0);
    assert.equal(harness.alerts.get("alert-1")?.incident_id, null);

    const second = await executeTransactionalIncidentCreate(harness.admin, {
      alerts: [alert],
      reason: "critical_high_impact",
    });

    assert.equal(second.ok, true);
    if (second.ok) {
      assert.equal(second.created, true);
      assert.equal(harness.incidents.size, 1);
      assert.equal(harness.alerts.get("alert-1")?.incident_id, second.incident.id);
    }

    const third = await executeTransactionalIncidentCreate(harness.admin, {
      alerts: [alert],
      reason: "critical_high_impact",
    });

    assert.equal(third.ok, true);
    if (third.ok) {
      assert.equal(third.created, false);
      assert.equal(third.idempotent, true);
    }
    assert.equal(harness.incidents.size, 1);
  });
});
