#!/usr/bin/env node

/**
 * Remote production validation for Nexus AI Analysis.
 *
 * Usage:
 *   BASE_URL=https://your-app.vercel.app OWNER_COOKIE="sb-..." node scripts/validate-nexus-ai-analysis.mjs
 */

const PROMPTS = [
  "What deserves my attention today?",
  "What is our biggest risk?",
  "What is our biggest opportunity?",
  "Explain mission score.",
  "Explain growth forecast.",
];

const baseUrl = process.env.BASE_URL?.replace(/\/$/, "");
const cookie = process.env.OWNER_COOKIE?.trim();

if (!baseUrl || !cookie) {
  console.error("BASE_URL and OWNER_COOKIE are required.");
  process.exit(1);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Cookie: cookie,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  return { response, payload };
}

try {
  const status = await request("/api/nexus/ai-analysis");
  console.log("Config status:", status.response.status, status.payload);

  const probe = await request("/api/nexus/ai-analysis?probe=1");
  console.log("OpenAI probe:", probe.response.status, probe.payload);

  for (const question of PROMPTS) {
    const result = await request("/api/nexus/ai-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    console.log(`\n${question}`);
    console.log(`  status=${result.response.status}`);
    if (result.payload?.analysis) {
      console.log(`  confidence=${result.payload.confidence}`);
      console.log(`  audit_logged=${result.payload.audit_logged}`);
    } else {
      console.log(`  error=${result.payload?.error ?? "unknown"}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
