import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";

const ROLES = new Set(["user", "moderator", "admin"]);
const STATUSES = new Set(["active", "suspended", "limited", "blocked", "deletion_pending", "deleted"]);

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { profileId?: string; role?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const profileId = body.profileId?.trim();
  const role = body.role?.trim();
  const status = body.status?.trim();

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  if (!role || !ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!status || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (profileId === auth.session.userId && status !== "active") {
    return NextResponse.json(
      { error: "You cannot suspend, block, or limit your own admin account." },
      { status: 400 },
    );
  }

  const admin = createAdminServiceClient();
  const { data, error } = await admin.rpc("admin_update_profile_access", {
    target_user_id: profileId,
    new_role: role,
    new_status: status,
  });

  if (error) {
    const statusCode = error.message.toLowerCase().includes("forbidden") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status: statusCode });
  }

  return NextResponse.json({ profile: data });
}
