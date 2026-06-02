import { getFirebasePublicConfig, getFirebaseVapidKey } from "@/lib/push/firebase-public";
import { isFcmServerConfigured } from "@/lib/push/fcm-server";

export type PushProductionReadiness = {
  clientConfigured: boolean;
  serverConfigured: boolean;
  dispatchSecretConfigured: boolean;
  supabaseAdminConfigured: boolean;
  appUrlConfigured: boolean;
  readyForWebPush: boolean;
  missing: string[];
};

export function getPushProductionReadiness(): PushProductionReadiness {
  const missing: string[] = [];

  const clientConfigured = Boolean(getFirebasePublicConfig() && getFirebaseVapidKey());
  if (!clientConfigured) {
    missing.push("NEXT_PUBLIC_FIREBASE_* and NEXT_PUBLIC_FIREBASE_VAPID_KEY");
  }

  const serverConfigured = isFcmServerConfigured();
  if (!serverConfigured) {
    missing.push("FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_PROJECT_ID + CLIENT_EMAIL + PRIVATE_KEY)");
  }

  const dispatchSecretConfigured = Boolean(process.env.PUSH_DISPATCH_SECRET || process.env.CRON_SECRET);
  if (!dispatchSecretConfigured) {
    missing.push("PUSH_DISPATCH_SECRET (and optional CRON_SECRET for Vercel Cron)");
  }

  const supabaseAdminConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (!supabaseAdminConfigured) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  const appUrlConfigured = Boolean(process.env.NEXT_PUBLIC_APP_URL);
  if (!appUrlConfigured) {
    missing.push("NEXT_PUBLIC_APP_URL (deep links in push payloads)");
  }

  return {
    clientConfigured,
    serverConfigured,
    dispatchSecretConfigured,
    supabaseAdminConfigured,
    appUrlConfigured,
    readyForWebPush:
      clientConfigured &&
      serverConfigured &&
      dispatchSecretConfigured &&
      supabaseAdminConfigured &&
      appUrlConfigured,
    missing,
  };
}
