export type SupabaseAdminEnv = {
  url: string;
  serviceRoleKey: string;
};

/** Public Supabase project URL (also available in the browser). */
export function getSupabaseProjectUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return value || undefined;
}

/**
 * Server-only service role key. Checked in priority order so Vercel/Supabase
 * integrations that use alternate names still resolve.
 */
export function getSupabaseServiceRoleKey(): string | undefined {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

export function getMissingSupabaseAdminEnvVars(): string[] {
  const missing: string[] = [];
  if (!getSupabaseProjectUrl()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!getSupabaseServiceRoleKey()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return missing;
}

export function assertSupabaseAdminEnv(): SupabaseAdminEnv {
  const url = getSupabaseProjectUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const missing = getMissingSupabaseAdminEnvVars();

  if (missing.length > 0) {
    throw new Error(`Missing Supabase env var(s): ${missing.join(", ")}`);
  }

  return { url: url!, serviceRoleKey: serviceRoleKey! };
}
