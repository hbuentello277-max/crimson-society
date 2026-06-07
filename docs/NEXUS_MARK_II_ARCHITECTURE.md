# Nexus Mark II — Architecture Plan

Mark II extends Nexus Mark I with AI-assisted analysis, founder chat, voice, and cross-platform control — **without autonomous execution**. Mark I must remain stable before any Mark II module ships.

Related: [NEXUS-MARK-I.md](./NEXUS-MARK-I.md)

---

## Mark II Principles

1. **Owner-only** — All Mark II surfaces require platform owner authentication.
2. **Read-first** — Phase 29+ begins read-only; no mutations until explicit approval gates exist.
3. **Grounded in Nexus data** — AI responses cite Mission Control, Decision Engine, Scenarios, Reports, Metrics, and related engines. No hallucinated platform state.
4. **No autonomous actions** — AI may summarize, explain, recommend, and warn. It may not execute.
5. **Approval required for future execution** — Any Mark II execution path requires owner confirmation, audit log, and existing Operator/Automation guardrails.

### Prohibited without explicit future phase approval

- Stripe / payment mutations
- User profile or membership mutations
- Shop inventory or order mutations
- Message, meet, or post mutations
- External API writes
- Cron or automation triggers initiated by AI

---

## Mark I Foundation (Phase 28)

Mark II builds on consolidated Mark I infrastructure:

| Layer | Mark I asset |
|-------|----------------|
| Data | `loadReportContext`, strategic engines, `runCached` request dedupe |
| Scoring | `lib/nexus/scoring.ts`, domain formulas in Mark I doc |
| Trends | `lib/metrics/trends.ts` |
| Health | `lib/mission-health/degraded.ts` |
| API | `ownerReadRoute`, `ownerReadRouteWithRequest`, `nexusOk` |
| Nav | `lib/nexus/nav-routes.ts` (25 modules) |
| Sync | `POST /api/nexus/sync` → `runNexusSyncPipeline` |

---

## 1. Founder Chat Interface

### Purpose

Owner asks Nexus natural-language questions and receives answers grounded in current platform state.

### Phase 29 scope (read-only)

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Founder UI  │────▶│ /api/nexus/chat  │────▶│ Nexus Context Bundle │
│ (chat pane) │     │ owner-only POST  │     │ (cached engines)     │
└─────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                        │
                        ┌───────────────────────────────┘
                        ▼
              ┌─────────────────────┐
              │ Grounding assembler  │
              │ (deterministic JSON) │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ LLM adapter (Mark II)│
              │ system: read-only    │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │ Response + citations │
              └─────────────────────┘
```

### Proposed routes

- `GET /admin/nexus/chat` — Chat UI (owner-only page)
- `POST /api/nexus/chat` — Send message, return grounded reply
- `GET /api/nexus/chat/history` — Session history (owner-scoped)

### Data grounding sources

Mission Control, Decision Engine, Scenarios, Copilot, Forecasting, Planning, Reports, Briefings, Alerts, Incidents, Metrics.

### Safety

- Rate limit per owner
- No tool calls that mutate data in Phase 29
- Every response includes `sources[]` with Nexus route references
- Confidence warning when grounding data is stale or partial

---

## 2. AI-Assisted Analysis

### Purpose

Enhance deterministic Mark I outputs with natural-language summaries — not replace scoring.

### Capabilities (phased)

| Capability | Input | Output | Autonomy |
|------------|-------|--------|----------|
| Executive summary | Mission Control + Decision Engine | 3–5 sentence brief | None |
| Anomaly explanation | Alerts + Incidents + Correlations | Plain-language cause hypothesis | None |
| Recommendation narrative | Decision Engine rankings | Why this decision ranks first | None |
| Confidence warning | Low-confidence forecasts | "Insufficient data" alert | None |

### Architecture

```
Deterministic engines (Mark I)
        │
        ▼
┌───────────────────┐
│ Analysis context   │  ← structured payload, no LLM in loop
│ builder            │
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ Optional LLM layer │  ← Phase 30+
│ (summaries only)   │
└─────────┬─────────┘
          ▼
┌───────────────────┐
│ UI panels with     │
│ "Deterministic" vs │
│ "AI summary" tabs  │
└───────────────────┘
```

### Rules

- Deterministic score always shown alongside AI summary
- AI cannot override mission status, decision priority, or scenario ranking
- `confidence_warning: true` when average engine confidence < threshold

---

## 3. Voice Interface

### Purpose

Hands-free founder access to briefings and key Nexus answers.

### Phase 31 scope

| Feature | Description |
|---------|-------------|
| Press-to-talk | Hold button → transcribe → chat pipeline |
| Spoken briefings | TTS readout of weekly/monthly briefing + mission summary |
| Voice commands (later) | "Sync Nexus", "What's my top decision?" — read-only queries first |

### Architecture

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
│ PWA mic API  │───▶│ Speech-to-text   │───▶│ Chat pipeline │
└──────────────┘    │ (browser / API)  │    └──────┬───────┘
                    └─────────────────┘           │
┌──────────────┐    ┌─────────────────┐           │
│ Audio output │◀───│ Text-to-speech   │◀──────────┘
└──────────────┘    └─────────────────┘
```

### Safety

- Owner-only; mic permission explicit
- No voice-triggered execution in early phases
- Spoken content mirrors read-only chat responses

---

## 4. Cross-Platform Control Center

### Purpose

Unified Nexus experience across mobile PWA, desktop, and future tablet/dashboard layouts.

### Layout tiers

| Breakpoint | Layout |
|------------|--------|
| Mobile (<768px) | Single column, chip nav, overflow-contained tables |
| Desktop (≥1024px) | Left rail nav (current), multi-column sections |
| Tablet (768–1023px) | Collapsible rail, 2-column cards |
| Dashboard mode (future) | Large-format mission hero + comparison grid for wall display |

### Shared component strategy

- `NexusSectionFrame` — all module pages
- `NexusShell` — nav + safe-area + overflow-x-hidden
- Strategic centers (Mission Control → Scenarios) share hero + section pattern
- Mark II chat/voice as floating founder panel (desktop) or bottom sheet (mobile)

### PWA considerations

- Safe-area insets on iOS (`env(safe-area-inset-*)`)
- Offline: show last-synced timestamp; disable chat when stale
- Install prompt unchanged; Nexus remains `/admin/nexus` entry

---

## Proposed Mark II Phase Map

| Phase | Module | Scope |
|-------|--------|-------|
| 29 | Founder Chat | Read-only Q&A, grounded context, citations |
| 30 | AI Analysis | Summary panels on Mission Control / Decision Engine |
| 31 | Voice | Press-to-talk + spoken briefings |
| 32 | Cross-platform polish | Tablet layout, dashboard mode, chat shell |
| 33+ | Controlled execution | Owner-approved actions only; extends Operator |

---

## API Additions (future)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/nexus/chat` | POST | Grounded chat message |
| `/api/nexus/chat/history` | GET | Owner chat history |
| `/api/nexus/analysis/summary` | POST | AI summary of engine bundle |
| `/api/nexus/voice/transcribe` | POST | Optional server STT |
| `/api/nexus/voice/briefing` | GET | Briefing script for TTS |

All routes: `requireOwnerSession`, rate limits, audit log via `logNexusActivity`.

---

## Database (future migrations)

- `nexus_chat_sessions` — owner_id, created_at
- `nexus_chat_messages` — session_id, role, content, sources_json, created_at
- `nexus_ai_summaries` — engine_key, input_hash, summary, model, created_at (cache)

No migrations in Mark I freeze.

---

## Security Checklist for Mark II

- [ ] Owner session on every Mark II route
- [ ] Rate limits on chat and voice endpoints
- [ ] Grounding payload logged (not raw LLM prompts with secrets)
- [ ] No service role keys exposed to client
- [ ] AI system prompt enforces read-only
- [ ] Execution paths blocked at API layer, not prompt-only
- [ ] RLS on chat tables scoped to owner

---

## Readiness for Phase 29

Mark I is ready for Phase 29 when:

- [x] All 25 modules operational
- [x] Shared scoring/trends/degraded utilities
- [x] Request-scoped engine cache
- [x] Standardized read routes for command stack
- [x] Mark II architecture documented
- [ ] Mark II feature flags/env vars defined (Phase 29 start)
- [ ] LLM provider adapter stub (Phase 29)

**Verdict:** Nexus Mark I is ready to begin Phase 29 (Founder Chat, read-only).
