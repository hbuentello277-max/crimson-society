import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

/**
 * Pixabay Music API — internal endpoint used by pixabay.com/music/
 * The public API docs only document /api/ (images) and /api/videos/ (video).
 * The music search endpoint is /api/music/ and accepts the same key + q params.
 *
 * Track shape returned by /api/music/:
 *   id, name, tags, user, duration, previewURL, pageURL, picture, userImageURL
 */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" || profile?.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!PIXABAY_API_KEY) {
    return NextResponse.json({ error: "Missing PIXABAY_API_KEY" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ hits: [] });
  }

  // Pixabay Music endpoint (not listed in public docs but powers pixabay.com/music/)
  const url =
    `https://pixabay.com/api/music/?key=${encodeURIComponent(PIXABAY_API_KEY)}` +
    `&q=${encodeURIComponent(q)}&per_page=20&safesearch=true`;

  let response: Response;
  let rawBody: string;

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "CrimsonSociety/1.0",
      },
    });
    rawBody = await response.text();
  } catch (fetchError) {
    const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    console.error("[pixabay-search] fetch threw:", msg);
    return NextResponse.json(
      { error: `Network error reaching Pixabay: ${msg}` },
      { status: 502 },
    );
  }

  if (!response.ok) {
    console.error(
      `[pixabay-search] Pixabay returned HTTP ${response.status}. Body: ${rawBody.slice(0, 500)}`,
    );
    return NextResponse.json(
      {
        error: `Pixabay API error ${response.status}: ${rawBody.slice(0, 300) || "(empty body)"}`,
        pixabayStatus: response.status,
        pixabayBody: rawBody.slice(0, 500),
      },
      { status: 502 },
    );
  }

  let data: { hits?: unknown[] };
  try {
    data = JSON.parse(rawBody) as { hits?: unknown[] };
  } catch {
    console.error("[pixabay-search] Failed to parse Pixabay JSON:", rawBody.slice(0, 300));
    return NextResponse.json(
      { error: `Pixabay returned invalid JSON: ${rawBody.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const hits = Array.isArray(data.hits) ? data.hits : [];
  console.log(`[pixabay-search] query="${q}" → ${hits.length} hit(s)`);

  return NextResponse.json({ hits });
}
