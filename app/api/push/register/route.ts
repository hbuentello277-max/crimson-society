import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";
import {
  getDeployCommitSha,
  logPushRegister,
  pushRegisterJson,
  PUSH_REGISTER_API_VERSION,
} from "@/lib/push/register-api";

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isPermissionOrRlsError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("rls") ||
    lower.includes("42501")
  );
}

type TokenUpsertPayload = {
  user_id: string;
  token: string;
  platform: "web" | "ios" | "android";
  user_agent: string | null;
  enabled: boolean;
  updated_at: string;
};

async function upsertPushToken(
  supabase: SupabaseClient,
  userId: string,
  payload: TokenUpsertPayload,
) {
  const primary = await supabase.from("user_push_tokens").upsert(payload, {
    onConflict: "user_id,token",
  });

  if (!primary.error) {
    return { error: null as null, usedServiceRole: false };
  }

  if (!isPermissionOrRlsError(primary.error.message)) {
    return { error: primary.error, usedServiceRole: false };
  }

  const admin = getServiceRoleClient();
  if (!admin) {
    return { error: primary.error, usedServiceRole: false };
  }

  logPushRegister({
    event: "token_upsert_rls_fallback",
    userId,
    primaryError: primary.error.message,
  });

  const fallback = await admin.from("user_push_tokens").upsert(payload, {
    onConflict: "user_id,token",
  });

  return {
    error: fallback.error ?? primary.error,
    usedServiceRole: !fallback.error,
  };
}

export async function GET() {
  return pushRegisterJson({
    ok: true,
    endpoint: "/api/push/register",
    version: PUSH_REGISTER_API_VERSION,
    commit: getDeployCommitSha(),
    requiresServiceRoleForRegister: false,
  });
}

export async function POST(request: Request) {
  const authMethodHeader = request.headers.get("authorization") ? "bearer" : "cookie";

  try {
    const auth = await getAuthedSupabaseFromRequest(request);

    if (!auth.ok) {
      logPushRegister({
        event: "auth_failed",
        authMethod: auth.authMethod,
        authMethodHeader,
        userFound: false,
        status: 401,
        error: auth.error,
        authDetail: auth.authDetail,
      });

      return pushRegisterJson(
        {
          ok: false,
          code: "AUTH_FAILED",
          error: auth.error,
          authMethod: auth.authMethod,
          authDetail: auth.authDetail,
        },
        401,
      );
    }

    const { supabase, userId, authMethod } = auth;

    let body: { token?: string; platform?: string; userAgent?: string | null };
    try {
      body = await request.json();
    } catch {
      logPushRegister({
        event: "invalid_body",
        authMethod,
        userFound: true,
        userId,
        status: 400,
      });
      return pushRegisterJson(
        { ok: false, code: "INVALID_BODY", error: "Invalid JSON body." },
        400,
      );
    }

    if (!body.token?.trim()) {
      logPushRegister({
        event: "missing_token",
        authMethod,
        userFound: true,
        userId,
        status: 400,
      });
      return pushRegisterJson(
        { ok: false, code: "MISSING_TOKEN", error: "Missing push token." },
        400,
      );
    }

    const now = new Date().toISOString();
    const platform =
      body.platform === "ios" || body.platform === "android" || body.platform === "web"
        ? body.platform
        : "web";

    const tokenPayload: TokenUpsertPayload = {
      user_id: userId,
      token: body.token.trim(),
      platform,
      user_agent: body.userAgent || null,
      enabled: true,
      updated_at: now,
    };

    const { error: tokenError, usedServiceRole } = await upsertPushToken(
      supabase,
      userId,
      tokenPayload,
    );

    if (tokenError) {
      logPushRegister({
        event: "token_upsert_failed",
        authMethod,
        userFound: true,
        userId,
        status: 500,
        tokenUpsertError: tokenError.message,
        tokenUpsertCode: tokenError.code,
        usedServiceRole,
      });

      return pushRegisterJson(
        {
          ok: false,
          code: "TOKEN_UPSERT_FAILED",
          error: tokenError.message,
          hint:
            tokenError.message.includes("user_push_tokens") ||
            tokenError.message.includes("does not exist")
              ? "Apply migration 20260602180000_push_notifications.sql on Supabase production."
              : undefined,
        },
        500,
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ push_notifications_enabled: true })
      .eq("id", userId);

    if (profileError) {
      logPushRegister({
        event: "profile_update_failed_non_fatal",
        authMethod,
        userFound: true,
        userId,
        status: 200,
        profileError: profileError.message,
        tokenSaved: true,
        usedServiceRole,
      });
    } else {
      logPushRegister({
        event: "register_success",
        authMethod,
        userFound: true,
        userId,
        status: 200,
        usedServiceRole,
      });
    }

    return pushRegisterJson({
      ok: true,
      authMethod,
      tokenSaved: true,
      profileUpdated: !profileError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register push token.";
    logPushRegister({
      event: "unexpected_error",
      authMethod: authMethodHeader,
      userFound: false,
      status: 500,
      error: message,
    });
    return pushRegisterJson({ ok: false, code: "INTERNAL_ERROR", error: message }, 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthedSupabaseFromRequest(request);

    if (!auth.ok) {
      logPushRegister({
        event: "auth_failed",
        authMethod: auth.authMethod,
        userFound: false,
        status: 401,
        error: auth.error,
        route: "DELETE",
      });
      return pushRegisterJson(
        { ok: false, code: "AUTH_FAILED", error: auth.error },
        401,
      );
    }

    const { supabase, userId, authMethod } = auth;
    const now = new Date().toISOString();

    const { error: tokenError } = await supabase
      .from("user_push_tokens")
      .update({ enabled: false, updated_at: now })
      .eq("user_id", userId);

    if (tokenError) {
      logPushRegister({
        event: "token_disable_failed",
        authMethod,
        userId,
        status: 500,
        error: tokenError.message,
        route: "DELETE",
      });
      return pushRegisterJson(
        { ok: false, code: "TOKEN_DISABLE_FAILED", error: tokenError.message },
        500,
      );
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ push_notifications_enabled: false })
      .eq("id", userId);

    if (profileError) {
      logPushRegister({
        event: "profile_disable_failed_non_fatal",
        authMethod,
        userId,
        profileError: profileError.message,
        route: "DELETE",
      });
    }

    return pushRegisterJson({ ok: true, authMethod });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disable push token.";
    logPushRegister({ event: "unexpected_error", status: 500, error: message, route: "DELETE" });
    return pushRegisterJson({ ok: false, code: "INTERNAL_ERROR", error: message }, 500);
  }
}
