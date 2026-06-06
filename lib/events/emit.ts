import {
  ingestNexusEvent,
  type IngestNexusEventResult,
  type NexusEventInput,
} from "@/lib/events/ingest";

export type EmitNexusEventInput = NexusEventInput;

export async function emitNexusEvent(
  input: EmitNexusEventInput,
): Promise<IngestNexusEventResult> {
  return ingestNexusEvent(input);
}
