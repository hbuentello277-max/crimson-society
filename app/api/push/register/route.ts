import { createClient } from "@supabase/supabase-js";
import { getAuthedSupabaseFromRequest } from "@/lib/supabase-route-auth";
import {
  getDeployCommitSha,
  logPushRegister,
  pushRegisterJson,
  PUSH_REGISTER_API_VERSION,
  type PushRegisterDebug,
} from "@/lib/push/register-api";
import { savePushTokenRow, setPushNotificationsEnabled, type PushPlatform } from "@/lib/push/save-token";

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function readBearerMeta(request: Request) {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";
  return {
    receivedAuthorizationHeader: Boolean(header),
    bearerTokenLength: token.length,
  };
}

export async function GET() {
  return pushRegisterJson({
    ok: true,
    endpoint: "/api/push/register",
    version: PUSH_REGISTER_API_VERSION,
    commit: getDeployCommitSha(),
    requiresServiceRoleForRegister: false,
    note: "POST saves FCM token; errors include code and debug fields",
  });
}

export async function POST(request: Request) {
  const bearerMeta = readBearerMeta(request);

  try {
    const auth = await getAuthedSupabaseFromRequest(request);

    const debug: PushRegisterDebug = {
      ...bearerMeta,
      authMethod: auth.ok ? auth.authMethod : auth.authMethod,
      userFound: auth.ok,
      userIdPrefix: auth.ok ? auth.userId.slice(0, 8) : undefined,
    };

    if (!auth.ok) {
      logPushRegister({
        event: "auth_failed",
        ...debug,
        status: 401,
        error: auth.error,
        authDetail: auth.authDetail,
      });

      return pushRegisterJson(
        {
          ok: false,
          code: "AUTH_FAILED",
          error: auth.error,
          authDetail: auth.authDetail,
          debug,
        },
        401,
      );
    }

    const { userId, authMethod } = auth;

    let body: { token?: string; platform?: string; userAgent?: string | null };
    try {
      body = await request.json();
    } catch {
      return pushRegisterJson(
        { ok: false, code: "INVALID_BODY", error: "Invalid JSON body.", debug },
        400,
      );
    }

    if (!body.token?.trim()) {
      return pushRegisterJson(
        { ok: false, code: "MISSING_TOKEN", error: "Missing push token.", debug },
        400,
      );
    }

    const platform: PushPlatform =
      body.platform === "ios" || body.platform === "android" || body.platform === "web"
        ? body.platform
        : "web";

    const saveInput = {
      userId,
      token: body.token.trim(),
      platform,
      userAgent: body.userAgent || null,
    };

    const admin = getServiceRoleClient();
    const saveClient = admin ?? auth.supabase;
    const usedServiceRole = Boolean(admin);

    const saveResult = await savePushTokenRow(saveClient, saveInput);

    if (!saveResult.ok) {
      debug.tokenUpsertError = saveResult.message;
      debug.tokenUpsertCode = saveResult.code;
      debug.usedServiceRole = usedServiceRole;

      logPushRegister({
        event: "token_upsert_failed",
        ...debug,
        status: 500,
      });

      return pushRegisterJson(
        {
          ok: false,
          code: "TOKEN_UPSERT_FAILED",
          error: saveResult.message,
          hint: saveResult.hint,
          debug,
        },
        500,
      );
    }

    debug.usedServiceRole = usedServiceRole;

    const profileClient = admin ?? auth.supabase;
    const { error: profileError } = await setPushNotificationsEnabled(
      profileClient,
      userId,
      true,
    );

    if (profileError) {
      logPushRegister({
        event: "profile_update_failed_non_fatal",
        ...debug,
        status: 200,
        profileError: profileError.message,
        tokenSaved: true,
      });
    } else {
      logPushRegister({
        event: "register_success",
        ...debug,
        status: 200,
      });
    }

    return pushRegisterJson({
      ok: true,
      authMethod,
      tokenSaved: true,
      profileUpdated: !profileError,
      profileError: profileError?.message,
      debug,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register push token.";
    logPushRegister({
      event: "unexpected_error",
      ...bearerMeta,
      status: 500,
      error: message,
    });
    return pushRegisterJson(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        error: message,
        debug: {
          ...bearerMeta,
          authMethod: "none",
          userFound: false,
        },
      },
      500,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getAuthedSupabaseFromRequest(request);
    if (!auth.ok) {
      return pushRegisterJson(
        {
          ok: false,
          code: "AUTH_FAILED",
          error: auth.error,
          authDetail: auth.authDetail,
        },
        401,
      );
    }

    const admin = getServiceRoleClient();
    const client = admin ?? auth.supabase;
    const now = new Date().toISOString();

    const { error: tokenError } = await client
      .from("user_push_tokens")
      .update({ enabled: false, updated_at: now })
      .eq("user_id", auth.userId);

    if (tokenError) {
      return pushRegisterJson(
        { ok: false, code: "TOKEN_DISABLE_FAILED", error: tokenError.message },
        500,
      );
    }

    await setPushNotificationsEnabled(client, auth.userId, false);

    return pushRegisterJson({ ok: true, authMethod: auth.authMethod });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disable push token.";
    return pushRegisterJson({ ok: false, code: "INTERNAL_ERROR", error: message }, 500);
  }
}
