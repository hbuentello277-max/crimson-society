import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NexusVoiceConfirmToolName } from "@/lib/admin/nexus-voice/types";
import { isNexusVoiceConfirmTool } from "@/lib/admin/nexus-voice/types";

const TOKEN_VERSION = 1;
const TOKEN_TTL_MS = 10 * 60 * 1000;

export type NexusVoiceConfirmationPayload = {
  v: number;
  nonce: string;
  userId: string;
  tool: NexusVoiceConfirmToolName;
  draft: Record<string, unknown>;
  exp: number;
};

function signingSecret(): string {
  return (
    process.env.NEXUS_VOICE_CONFIRM_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "nexus-voice-dev-secret"
  );
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", signingSecret()).update(encodedPayload).digest("base64url");
}

export function createNexusVoiceConfirmationToken(input: {
  userId: string;
  tool: NexusVoiceConfirmToolName;
  draft: Record<string, unknown>;
}): { token: string; expiresAt: string } {
  const payload: NexusVoiceConfirmationPayload = {
    v: TOKEN_VERSION,
    nonce: randomBytes(12).toString("hex"),
    userId: input.userId,
    tool: input.tool,
    draft: input.draft,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  const expiresAt = new Date(payload.exp).toISOString();

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt,
  };
}

export function verifyNexusVoiceConfirmationToken(
  token: string,
  expectedUserId: string,
): { ok: true; payload: NexusVoiceConfirmationPayload } | { ok: false; error: string } {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return { ok: false, error: "Invalid confirmation token." };
  }

  const expectedSignature = signPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, error: "Confirmation token signature mismatch." };
  }

  let payload: NexusVoiceConfirmationPayload;
  try {
    payload = JSON.parse(decodeBase64Url(encodedPayload)) as NexusVoiceConfirmationPayload;
  } catch {
    return { ok: false, error: "Confirmation token payload is invalid." };
  }

  if (payload.v !== TOKEN_VERSION) {
    return { ok: false, error: "Unsupported confirmation token version." };
  }

  if (payload.userId !== expectedUserId) {
    return { ok: false, error: "Confirmation token does not match this admin session." };
  }

  if (!isNexusVoiceConfirmTool(payload.tool)) {
    return { ok: false, error: "Unsupported confirmation action." };
  }

  if (!payload.exp || Date.now() > payload.exp) {
    return { ok: false, error: "Confirmation token expired. Run the command again." };
  }

  if (!payload.draft || typeof payload.draft !== "object") {
    return { ok: false, error: "Confirmation draft payload is missing." };
  }

  return { ok: true, payload };
}
