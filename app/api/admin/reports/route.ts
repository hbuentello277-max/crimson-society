import { NextResponse } from "next/server";
import { createAdminServiceClient, requireAdminSession } from "@/lib/admin-api";

const REPORT_STATUSES = ["reviewing", "resolved", "dismissed"] as const;
type ReportStatus = (typeof REPORT_STATUSES)[number];

function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && REPORT_STATUSES.includes(value as ReportStatus);
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { id?: string; status?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, status } = body;

  if (!id || !isReportStatus(status)) {
    return NextResponse.json({ error: "Invalid report update payload." }, { status: 400 });
  }

  try {
    const adminClient = createAdminServiceClient();
    const now = new Date().toISOString();

    const { data, error } = await adminClient
      .from("user_reports")
      .update({ status, updated_at: now })
      .eq("id", id)
      .select("id, reporter_id, reported_user_id, ride_id, reason, details, status, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ report: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update report.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
