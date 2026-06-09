import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export type SafeQueryResult<T> = {
  data: T;
  available: boolean;
  error: string | null;
  partial: boolean;
};

function isMissingRelationError(error: PostgrestError | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

export async function safeCount(
  admin: SupabaseClient,
  table: string,
  apply?: (query: QueryBuilder) => QueryBuilder,
): Promise<SafeQueryResult<number>> {
  try {
    let query = admin.from(table).select("*", { count: "exact", head: true });
    if (apply) {
      query = apply(query);
    }

    const { count, error } = await query;
    if (error) {
      if (isMissingRelationError(error)) {
        return { data: 0, available: false, error: error.message, partial: true };
      }
      return { data: 0, available: true, error: error.message, partial: true };
    }

    return { data: count ?? 0, available: true, error: null, partial: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return { data: 0, available: false, error: message, partial: true };
  }
}

export async function safeSelect<T extends Record<string, unknown>>(
  admin: SupabaseClient,
  table: string,
  columns: string,
  apply?: (query: QueryBuilder) => QueryBuilder,
): Promise<SafeQueryResult<T[]>> {
  try {
    let query = admin.from(table).select(columns);
    if (apply) {
      query = apply(query);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingRelationError(error)) {
        return { data: [], available: false, error: error.message, partial: true };
      }
      return { data: [], available: true, error: error.message, partial: true };
    }

    return { data: ((data as unknown as T[]) ?? []), available: true, error: null, partial: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return { data: [], available: false, error: message, partial: true };
  }
}

export function collectWarnings(results: Array<SafeQueryResult<unknown>>): string[] {
  const warnings: string[] = [];
  for (const result of results) {
    if (!result.available) {
      warnings.push("Some monitoring data is unavailable in this environment.");
      break;
    }
  }

  for (const result of results) {
    if (result.error && result.available) {
      warnings.push(result.error);
    }
  }

  return [...new Set(warnings)].slice(0, 4);
}
