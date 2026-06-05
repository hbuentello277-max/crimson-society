import type { SupabaseClient } from "@supabase/supabase-js";

export type PushPlatform = "web" | "ios" | "android";

export type SavePushTokenInput = {
  userId: string;
  token: string;
  platform: PushPlatform;
  userAgent: string | null;
  deviceId?: string | null;
};

export type SavePushTokenResult =
  | { ok: true }
  | { ok: false; message: string; code?: string; hint?: string };

export async function savePushTokenRow(
  supabase: SupabaseClient,
  input: SavePushTokenInput,
): Promise<SavePushTokenResult> {
  const now = new Date().toISOString();
  const row = {
    user_id: input.userId,
    token: input.token.trim(),
    platform: input.platform,
    user_agent: input.userAgent,
    device_id: input.deviceId?.trim() || null,
    enabled: true,
    updated_at: now,
  };

  if (row.device_id) {
    const disableExistingForDevice = await supabase
      .from("user_push_tokens")
      .update({
        enabled: false,
        updated_at: now,
      })
      .eq("user_id", input.userId)
      .eq("device_id", row.device_id)
      .eq("enabled", true)
      .neq("token", row.token);

    if (disableExistingForDevice.error) {
      return {
        ok: false,
        message: disableExistingForDevice.error.message,
        code: disableExistingForDevice.error.code,
      };
    }
  }

  const upsert = await supabase.from("user_push_tokens").upsert(row, {
    onConflict: "user_id,token",
  });

  if (!upsert.error) {
    return { ok: true };
  }

  const insert = await supabase.from("user_push_tokens").insert(row);
  if (!insert.error) {
    return { ok: true };
  }

  if (insert.error.code === "23505") {
    const update = await supabase
      .from("user_push_tokens")
      .update({
        platform: row.platform,
        user_agent: row.user_agent,
        device_id: row.device_id,
        enabled: true,
        updated_at: now,
      })
      .eq("user_id", input.userId)
      .eq("token", row.token);

    if (!update.error) {
      return { ok: true };
    }

    return {
      ok: false,
      message: update.error.message,
      code: update.error.code,
    };
  }

  const message = upsert.error.message || insert.error.message;
  let hint: string | undefined;

  if (message.includes("foreign key") || message.includes("profiles")) {
    hint = "Your profile row may be missing. Sign out, sign in again, or complete profile setup.";
  } else if (
    message.toLowerCase().includes("permission denied") ||
    message.toLowerCase().includes("row-level security")
  ) {
    hint =
      "Apply migration 20260605120000_user_push_tokens_rls_repair.sql (or 20260602180000_push_notifications.sql) on Supabase.";
  }

  return {
    ok: false,
    message,
    code: upsert.error.code || insert.error.code,
    hint,
  };
}

export async function setPushNotificationsEnabled(
  supabase: SupabaseClient,
  userId: string,
  enabled: boolean,
) {
  return supabase
    .from("profiles")
    .update({ push_notifications_enabled: enabled })
    .eq("id", userId);
}
