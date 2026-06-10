#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.log("SKIP live Supabase verification: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.");
  console.log("Run lib/meets/legacy-meet-compat.test.ts via npm test for offline compatibility checks.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const MEET_FIELDS =
  "id, host_id, co_host_id, name, date, time, meet_point, destination, city, route, route_steps, waypoints, tracking_status, started_at, ended_at, meet_point_lat, meet_point_lng, destination_lat, destination_lng, distance, duration, status, meet_duration_minutes, created_at";

function parseRoute(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (point) =>
      point &&
      typeof point.lat === "number" &&
      Number.isFinite(point.lat) &&
      typeof point.lng === "number" &&
      Number.isFinite(point.lng),
  );
}

function hasRoadGeometry(route) {
  return route.length > 2;
}

function hasEndpoints(row) {
  return (
    Number.isFinite(row.meet_point_lat) &&
    Number.isFinite(row.meet_point_lng) &&
    Number.isFinite(row.destination_lat) &&
    Number.isFinite(row.destination_lng)
  );
}

function derivePhase(row, now = Date.now()) {
  if (row.status === "canceled") return "canceled";

  const start = row.date ? new Date(`${row.date}T${row.time?.includes(":") ? row.time : "00:00"}`) : null;
  if (!start || Number.isNaN(start.getTime())) return "upcoming";

  const end = new Date(`${row.date}T23:59:59.999`);
  if (now < start.getTime()) return "upcoming";
  if (now <= end.getTime()) return "active";
  return "past";
}

const { data: rows, error } = await supabase
  .from("rides")
  .select(MEET_FIELDS)
  .eq("status", "active")
  .order("date", { ascending: true })
  .order("time", { ascending: true })
  .limit(100);

if (error) {
  console.error("FAIL could not query rides:", error.message);
  process.exit(1);
}

const upcoming = (rows || []).filter((row) => {
  const phase = derivePhase(row);
  return phase === "upcoming" || phase === "active";
});

console.log(`Found ${upcoming.length} upcoming/active meets in Supabase (of ${rows?.length || 0} active rows scanned).`);

let failed = 0;
let warned = 0;

for (const row of upcoming) {
  const route = parseRoute(row.route);
  const issues = [];

  if (!row.host_id) issues.push({ level: "error", message: "missing host_id" });
  if (!hasRoadGeometry(route) && !hasEndpoints(row)) {
    issues.push({ level: "error", message: "missing route geometry and endpoint coordinates" });
  } else if (!hasRoadGeometry(route)) {
    issues.push({ level: "warn", message: "weak route geometry; repair expected on open" });
  }
  if (!row.meet_point?.trim()) issues.push({ level: "warn", message: "missing meet_point label" });
  if (!row.destination?.trim()) issues.push({ level: "warn", message: "missing destination label" });
  if (row.tracking_status == null) issues.push({ level: "warn", message: "tracking_status null; defaults to not_started" });

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warn");

  if (errors.length > 0) failed += 1;
  if (warnings.length > 0) warned += 1;

  const status = errors.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";
  console.log(
    `${status} ${row.id} | ${row.name || "Untitled Meet"} | tracking=${row.tracking_status || "not_started"} | routePts=${route.length}`,
  );

  for (const issue of issues) {
    console.log(`  ${issue.level}: ${issue.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} meet(s) have blocking compatibility errors.`);
  process.exit(1);
}

console.log(`\nAll ${upcoming.length} upcoming/active meets are compatible with the new modal/navigation flows.`);
if (warned > 0) {
  console.log(`${warned} meet(s) have warnings but should render with UI fallbacks.`);
}
