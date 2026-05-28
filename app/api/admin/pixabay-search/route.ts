import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

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

  const url =
    `https://pixabay.com/api/audio/?key=${encodeURIComponent(PIXABAY_API_KEY)}` +
    `&q=${encodeURIComponent(q)}&per_page=20&safesearch=true`;

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    return NextResponse.json({ error: "Pixabay search failed" }, { status: 502 });
  }

  const data = await response.json();
  return NextResponse.json({ hits: data.hits || [] });
}