import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertSupabaseAdminEnv } from "@/lib/supabase-admin-env";

/**
 * SERVER ONLY — never import from client components or browser bundles.
 * Uses SUPABASE_SERVICE_ROLE_KEY for Nexus internal writes to nexus_* tables.
 */

let nexusServiceClient: SupabaseClient | null = null;

export function createNexusServiceClient(): SupabaseClient {
  const { url, serviceRoleKey } = assertSupabaseAdminEnv();

  if (!nexusServiceClient) {
    nexusServiceClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return nexusServiceClient;
}
