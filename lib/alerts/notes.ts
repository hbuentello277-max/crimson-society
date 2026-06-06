import { randomUUID } from "crypto";
import type { NexusOwnerNote } from "@/lib/alerts/types";

const MAX_NOTE_LENGTH = 4000;

export function parseOwnerNotes(metadata: Record<string, unknown> | null | undefined): NexusOwnerNote[] {
  const raw = metadata?.owner_notes;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => item as NexusOwnerNote)
    .filter((note) => !note.deleted_at);
}

export function validateNoteBody(body: unknown): string | null {
  if (typeof body !== "string") {
    return "Note body must be a string.";
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return "Note body cannot be empty.";
  }

  if (trimmed.length > MAX_NOTE_LENGTH) {
    return `Note body cannot exceed ${MAX_NOTE_LENGTH} characters.`;
  }

  return null;
}

export function appendOwnerNote(input: {
  metadata: Record<string, unknown>;
  authorId: string;
  body: string;
  createdAt?: string;
}): { notes: NexusOwnerNote[]; note: NexusOwnerNote } {
  const existing = parseOwnerNotes(input.metadata);
  const now = input.createdAt ?? new Date().toISOString();
  const note: NexusOwnerNote = {
    id: randomUUID(),
    author_id: input.authorId,
    body: input.body.trim(),
    created_at: now,
    updated_at: null,
  };

  return {
    notes: [...existing, note],
    note,
  };
}

export function updateOwnerNote(input: {
  metadata: Record<string, unknown>;
  noteId: string;
  body: string;
}): { notes: NexusOwnerNote[]; note: NexusOwnerNote | null } {
  const existing = parseOwnerNotes(input.metadata);
  let updated: NexusOwnerNote | null = null;

  const notes = existing.map((note) => {
    if (note.id !== input.noteId) {
      return note;
    }

    updated = {
      ...note,
      body: input.body.trim(),
      updated_at: new Date().toISOString(),
    };
    return updated;
  });

  return { notes, note: updated };
}

export function softDeleteOwnerNote(input: {
  metadata: Record<string, unknown>;
  noteId: string;
}): { notes: NexusOwnerNote[]; deleted: boolean } {
  const existing = parseOwnerNotes(input.metadata);
  let deleted = false;

  const notes = existing.map((note) => {
    if (note.id !== input.noteId) {
      return note;
    }

    deleted = true;
    return {
      ...note,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  return { notes: deleted ? notes.filter((note) => !note.deleted_at) : existing, deleted };
}
