# Nexus Mark I — Consolidation Reference

Mark I freezes major Nexus feature development. This document records canonical scoring formulas, shared utilities, and readiness criteria.

## Shared Utilities (Phase 28)

| Module | Purpose |
|--------|---------|
| `lib/nexus/scoring.ts` | `clampScore`, `stablePercentChange`, `weightedScore`, `benefitFromRisk` |
| `lib/metrics/trends.ts` | `loadMetricSnapshotTrends`, `metricTrendDirection`, `trendDirectionScore` |
| `lib/mission-health/degraded.ts` | `DEGRADED_WORKFLOW_STATUSES`, `countDegradedWorkflows`, `isOperationalStress` |
| `lib/nexus/request-cache.ts` | Per-request dedupe via `runCached` (same Supabase client instance) |
| `lib/nexus/route-handler.ts` | `ownerReadRoute`, `ownerWriteRoute`, `nexusOk` |
| `lib/nexus/nav-routes.ts` | Canonical nav route order |

## Scoring Formulas

### Mission Score (`lib/mission-control/score.ts`)

```
mission_score = growth×0.15 + engagement×0.15 + revenue×0.15
              + operational_health×0.15 + workflow_health×0.15
              + opportunity_boost×(0.05×6.67)
              − incident_penalty×(0.10×2.5)
              − alert_penalty×(0.10×2.5)
```

Clamped 0–100. Status: Critical / At Risk / Dominating / Growing / Stable from score + alerts + incidents + system health.

### Decision Score (`lib/decision-engine/scoring.ts`)

```
decision_score = expected_impact×0.35 + urgency×0.25 + confidence×0.25 + strategic_importance×0.15
```

Priority: Critical (score≥85 or urgency≥90), High (≥70), Medium (≥50), Low otherwise.

### Scenario Score (`lib/scenarios/scoring.ts`)

```
scenario_score = expected_benefit×0.35 + strategic_impact×0.30 + confidence×0.25 − expected_risk×0.10
```

### Forecast Confidence / Risk (`lib/forecasting/scoring.ts`)

Confidence from data points, span, consistency, supporting signals. Risk from confidence, trend direction, operational stress.

### Operational Intelligence (`lib/operational-intelligence/scoring.ts`)

```
influence = impact×0.45 + confidence×0.35 + alignment×0.20
combined_ranking = influence×0.40 + impact×0.35 + confidence×0.25
severity = impact×0.50 + recurrence×0.30 + confidence×0.20
```

### Intelligence / Correlations Impact

Category-based base impact + count boost. Confidence from signal comparison or signal count.

## Trend Direction (canonical)

```
previous null → unknown (score 50)
current > previous → up (score 85)
current < previous → down (score 35)
else → flat (score 60)
```

## Degraded Workflows (canonical statuses)

`degraded`, `impaired`, `critical`, `failing`, `warn`, `warning`

## Operational Stress (canonical)

```
operational_stress = degraded_workflows > 0
                  OR active_alerts > 0
                  OR open_incidents > 0
                  OR system_status !== "operational"
```

## Request Caching

Strategic engines wrapped with `runCached` per Supabase client:

- `loadReportContext`
- `getNexusPlanning`, `getNexusForecasting`, `getNexusCopilot`
- `getNexusMissionControl`, `getNexusDecisionEngine`, `getNexusOperationalIntelligence`
- `getNexusScenarios`, `getNexusIntelligence`, `getNexusCorrelations`, `getNexusMemorySummary`
- `loadMetricSnapshotTrends`

Nested engine calls within one API request share in-flight promises, eliminating redundant DB fan-out.

## Security

- All `/api/nexus/*` routes: `requireOwnerSession()` + rate limits
- Owner check: `is_platform_owner` RPC + profile fallback
- Read-only strategic modules: no mutations, no AI, no execution

## Navigation Order

See `lib/nexus/nav-routes.ts`. Founder (`/admin/nexus`) remains default landing. Command stack ends with Scenarios.

## Mark I Readiness

- All 25 nav modules implemented with owner-only API/UI
- Deterministic scoring documented above
- Shared trend/degraded/scoring utilities consolidated
- Per-request cache reduces redundant loads on strategic pages
- TypeScript + production build validated

## Mark II Preparation

See [NEXUS_MARK_II_ARCHITECTURE.md](./NEXUS_MARK_II_ARCHITECTURE.md) for planned Founder Chat, AI-assisted analysis, Voice, and Cross-platform Control Center architecture.
