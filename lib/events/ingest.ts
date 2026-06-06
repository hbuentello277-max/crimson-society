import { createNexusServiceClient } from "@/lib/nexus/client";
import {
  NEXUS_EVENT_CATEGORIES,
  NEXUS_EVENT_SOURCES,
  NEXUS_SEVERITY_LEVELS,
  type NexusEventCategory,
  type NexusEventSource,
  type NexusSeverity,
} from "@/lib/nexus/constants";

export type NexusEventInput = {
  correlationId?: string | null;
  integrationId?: string | null;
  source: NexusEventSource;
  category: NexusEventCategory;
  eventType: string;
  severity: NexusSeverity;
  title: string;
  description?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: string | Date;
  processed?: boolean;
  metadata?: Record<string, unknown>;
};

export type NexusEventRecord = {
  id: string;
  correlation_id: string | null;
  integration_id: string | null;
  source: string;
  category: string;
  event_type: string;
  severity: string;
  title: string;
  description: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  ingested_at: string;
  processed: boolean;
  metadata: Record<string, unknown>;
};

export type IngestNexusEventResult =
  | { ok: true; event: NexusEventRecord }
  | { ok: false; error: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeOccurredAt(value?: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

export function validateNexusEventInput(input: NexusEventInput): string | null {
  if (!NEXUS_EVENT_SOURCES.includes(input.source)) {
    return `Invalid event source: ${input.source}`;
  }

  if (!NEXUS_EVENT_CATEGORIES.includes(input.category)) {
    return `Invalid event category: ${input.category}`;
  }

  if (!NEXUS_SEVERITY_LEVELS.includes(input.severity)) {
    return `Invalid event severity: ${input.severity}`;
  }

  if (!isNonEmptyString(input.eventType)) {
    return "eventType is required";
  }

  if (!isNonEmptyString(input.title)) {
    return "title is required";
  }

  return null;
}

export async function ingestNexusEvent(
  input: NexusEventInput,
): Promise<IngestNexusEventResult> {
  const validationError = validateNexusEventInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const admin = createNexusServiceClient();
  const row = {
    correlation_id: input.correlationId ?? null,
    integration_id: input.integrationId ?? null,
    source: input.source,
    category: input.category,
    event_type: input.eventType.trim(),
    severity: input.severity,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    payload: input.payload ?? {},
    occurred_at: normalizeOccurredAt(input.occurredAt),
    processed: input.processed ?? false,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await admin
    .from("nexus_events")
    .insert(row)
    .select(
      "id, correlation_id, integration_id, source, category, event_type, severity, title, description, payload, occurred_at, ingested_at, processed, metadata",
    )
    .single();

  if (error) {
    console.error("[nexus-events] ingest failed", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true, event: data as NexusEventRecord };
}
