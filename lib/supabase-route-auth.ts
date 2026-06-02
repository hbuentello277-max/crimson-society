import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

function getSupabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export type RouteAuthResult =
  | { supabase: SupabaseClient; userId: string }
  | { supabase: null; userId: null; error: string };

/**
 * Resolves the signed-in user for API routes.
 * Prefers Authorization Bearer (reliable in installed PWAs); falls back to SSR cookies.
 */
export async function getAuthedSupabaseFromRequest(
  request: Request,
): Promise<RouteAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getSupabasePublicKey();

  if (!supabaseUrl || !supabaseKey) {
    return { supabase: null, userId: null, error: "Supabase is not configured." };
  }

  const bearer = readBearerToken(request);

  if (bearer) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.id) {
      return { supabase: null, userId: null, error: "Unauthorized" };
    }

    return { supabase, userId: user.id };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return { supabase: null, userId: null, error: "Unauthorized" };
  }

  return { supabase, userId: user.id };
}
