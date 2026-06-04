import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import {
  CRIMSON_CREDITS_ECONOMY_KEY,
  DEFAULT_CRIMSON_CREDITS_ECONOMY,
  economySettingsToRowValue,
  mergeEconomySettings,
  validateEconomySettingsPatch,
} from "@/lib/credits/economy-settings";

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const adminClient = createAdminServiceClient();
    const { data, error } = await adminClient
      .from("platform_settings")
      .select("value, updated_at")
      .eq("key", CRIMSON_CREDITS_ECONOMY_KEY)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = mergeEconomySettings(
      (data?.value as Record<string, unknown> | undefined) ?? DEFAULT_CRIMSON_CREDITS_ECONOMY,
    );

    return NextResponse.json({ settings, updated_at: data?.updated_at ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load economy settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { settings?: Record<string, unknown> };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.settings || typeof body.settings !== "object") {
    return NextResponse.json({ error: "settings object is required" }, { status: 400 });
  }

  const validated = validateEconomySettingsPatch(body.settings);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const adminClient = createAdminServiceClient();

    const { data: existing, error: readError } = await adminClient
      .from("platform_settings")
      .select("value")
      .eq("key", CRIMSON_CREDITS_ECONOMY_KEY)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const merged = mergeEconomySettings({
      ...(existing?.value as Record<string, unknown> | undefined),
      ...validated.value,
    });

    const now = new Date().toISOString();
    const { data, error } = await adminClient
      .from("platform_settings")
      .upsert(
        {
          key: CRIMSON_CREDITS_ECONOMY_KEY,
          value: economySettingsToRowValue(merged),
          updated_at: now,
        },
        { onConflict: "key" },
      )
      .select("value, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      settings: mergeEconomySettings(data.value as Record<string, unknown>),
      updated_at: data.updated_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update economy settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
