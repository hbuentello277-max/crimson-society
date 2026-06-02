import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type RouteAuthMethod = "bearer" | "cookie" | "none";

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

export type RouteAuthSuccess = {
  ok: true;
  supabase: SupabaseClient;
  userId: string;
  authMethod: RouteAuthMethod;
};

export type RouteAuthFailure = {
  ok: false;
  supabase: null;
  userId: null;
  authMethod: RouteAuthMethod;
  error: string;
  authDetail?: string;
};

export type RouteAuthResult = RouteAuthSuccess | RouteAuthFailure;

/**
 * Resolves the signed-in user for API routes.
 * Bearer JWT is validated with auth.getUser(jwt) (required on the server).
 * Falls back to SSR cookies when no Authorization header is sent.
 */
export async function getAuthedSupabaseFromRequest(
  request: Request,
): Promise<RouteAuthResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getSupabasePublicKey();

  if (!supabaseUrl || !supabaseKey) {
    return {
      ok: false,
      supabase: null,
      userId: null,
      authMethod: "none",
      error: "Supabase is not configured.",
    };
  }

  const bearer = readBearerToken(request);

  if (bearer) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearer);

    if (error || !user?.id) {
      return {
        ok: false,
        supabase: null,
        userId: null,
        authMethod: "bearer",
        error: "Unauthorized",
        authDetail: error?.message || "Bearer JWT validation failed",
      };
    }

    return { ok: true, supabase, userId: user.id, authMethod: "bearer" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return {
      ok: false,
      supabase: null,
      userId: null,
      authMethod: "cookie",
      error: "Unauthorized",
      authDetail: error?.message || "No session cookie",
    };
  }

  return { ok: true, supabase, userId: user.id, authMethod: "cookie" };
}
