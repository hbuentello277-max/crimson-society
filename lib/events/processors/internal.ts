import type { NexusEventInput } from "@/lib/events/ingest";

/**
 * Mark I internal event processor stub.
 * Future phases may enrich, correlate, or fan-out internal events here.
 */
export function processInternalNexusEvent(input: NexusEventInput): NexusEventInput {
  return {
    ...input,
    metadata: {
      processor: "internal",
      processor_version: "mark1-stub",
      ...(input.metadata ?? {}),
    },
  };
}
