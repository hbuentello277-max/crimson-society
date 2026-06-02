import { NextResponse } from "next/server";

export const PUSH_REGISTER_API_VERSION = 3;

export function getDeployCommitSha() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_REF ||
    "local"
  );
}

export function pushRegisterJson<T extends Record<string, unknown>>(
  body: T,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-App-Commit": getDeployCommitSha(),
      "X-Push-Register-Version": String(PUSH_REGISTER_API_VERSION),
    },
  });
}

export function logPushRegister(event: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      scope: "push/register",
      ts: new Date().toISOString(),
      commit: getDeployCommitSha(),
      ...event,
    }),
  );
}

export type PushRegisterDebug = {
  receivedAuthorizationHeader: boolean;
  bearerTokenLength: number;
  authMethod: string;
  userFound: boolean;
  userIdPrefix?: string;
  tokenUpsertError?: string;
  tokenUpsertCode?: string;
  usedServiceRole?: boolean;
  usedDirectFallback?: boolean;
};
