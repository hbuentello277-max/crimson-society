import { NextResponse } from "next/server";
import { buildAppleAppSiteAssociation } from "@/lib/native/apple-app-site-association";

export async function GET() {
  const body = buildAppleAppSiteAssociation();

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
