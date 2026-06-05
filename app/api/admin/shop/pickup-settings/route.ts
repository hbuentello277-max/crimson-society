import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";
import { parseLocalPickupSettings } from "@/lib/shop/pickup-settings";
import { loadLocalPickupSettings, saveLocalPickupSettings } from "@/lib/shop/shop-settings-db";

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  const admin = createAdminServiceClient();
  const settings = await loadLocalPickupSettings(admin);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const settings = parseLocalPickupSettings(body);
  const admin = createAdminServiceClient();
  const result = await saveLocalPickupSettings(admin, settings, auth.session.userId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ settings });
}
