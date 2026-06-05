import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_LOCAL_PICKUP_SETTINGS,
  LOCAL_PICKUP_SETTINGS_KEY,
  parseLocalPickupSettings,
  type LocalPickupSettings,
} from "@/lib/shop/pickup-settings";

export async function loadLocalPickupSettings(
  client: SupabaseClient,
): Promise<LocalPickupSettings> {
  const { data, error } = await client
    .from("shop_settings")
    .select("value")
    .eq("key", LOCAL_PICKUP_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    console.warn("[shop-settings] load local_pickup failed", error.message);
    return { ...DEFAULT_LOCAL_PICKUP_SETTINGS };
  }

  return parseLocalPickupSettings(data?.value);
}

export async function saveLocalPickupSettings(
  client: SupabaseClient,
  settings: LocalPickupSettings,
  updatedBy: string,
) {
  const { error } = await client.from("shop_settings").upsert(
    {
      key: LOCAL_PICKUP_SETTINGS_KEY,
      value: settings,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: "key" },
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
