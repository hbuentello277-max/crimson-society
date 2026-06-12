/** Production hosts served by the web app and Capacitor remote shell. */
export const APP_ASSOCIATED_HOSTS = ["crimsonsociety.app", "www.crimsonsociety.app"] as const;

export const APP_BUNDLE_ID = "com.crimsonsociety.app";

export const APP_CUSTOM_URL_SCHEME = "crimsonsociety";

export function getConfiguredAppOrigin() {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.CAPACITOR_SERVER_URL?.trim() ||
    "https://crimsonsociety.app";

  return fromEnv.replace(/\/$/, "");
}

export function getAppOrigins() {
  const origins = new Set<string>([
    getConfiguredAppOrigin(),
    "https://crimsonsociety.app",
    "https://www.crimsonsociety.app",
    "http://localhost:3000",
  ]);

  return [...origins];
}
