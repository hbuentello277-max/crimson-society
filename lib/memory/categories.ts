/** Founder memory categories stored in nexus_memory_entries.metadata.memory_category */

export const MEMORY_CATEGORIES = [
  "decision",
  "blocker",
  "milestone",
  "launch_status",
  "technical_note",
  "business_note",
  "marketing_note",
  "founder_preference",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

const CATEGORY_SET = new Set<string>(MEMORY_CATEGORIES);

export function isMemoryCategory(value: string): value is MemoryCategory {
  return CATEGORY_SET.has(value);
}

export function defaultImportanceForCategory(category: MemoryCategory): number {
  switch (category) {
    case "blocker":
    case "launch_status":
      return 8;
    case "decision":
    case "milestone":
      return 7;
    case "technical_note":
    case "business_note":
      return 6;
    case "marketing_note":
    case "founder_preference":
      return 5;
    default:
      return 6;
  }
}

export function memoryCategoryLabel(category: MemoryCategory): string {
  return category.replace(/_/g, " ");
}
