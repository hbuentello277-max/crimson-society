import { isSafeInternalPath } from "@/lib/auth/post-auth-redirect";
import { APP_CUSTOM_URL_SCHEME } from "@/lib/native/app-domains";

export type NativeDeepLinkAction =
  | { type: "ignore" }
  | { type: "full-load"; href: string }
  | { type: "client-navigate"; path: string };

const SERVER_HANDLED_PREFIXES = ["/auth/callback"];

const IN_APP_ROUTE_PREFIXES = [
  "/reset-password",
  "/forgot",
  "/login",
  "/signup",
  "/inbox",
  "/messages",
  "/notifications",
  "/meets",
  "/dashboard",
  "/profile/",
  "/connect/requests/",
  "/checkout/success",
  "/shop/checkout/success",
  "/blackcard",
  "/profile/orders",
  "/admin/",
] as const;

function normalizeCustomSchemePath(url: URL, customSchemes: string[]) {
  if (!customSchemes.includes(url.protocol.replace(/:$/, ""))) {
    return null;
  }

  if (url.host) {
    return `/${url.host}${url.pathname}`.replace(/\/{2,}/g, "/");
  }

  return url.pathname || "/";
}

function isAllowedOrigin(url: URL, allowedOrigins: string[]) {
  const origin = url.origin;
  return allowedOrigins.some((allowed) => allowed.replace(/\/$/, "") === origin);
}

function isSupportedInAppPath(pathname: string) {
  if (!isSafeInternalPath(pathname)) {
    return false;
  }

  if (pathname === "/") {
    return true;
  }

  return IN_APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

function requiresServerRoute(pathname: string) {
  return SERVER_HANDLED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix),
  );
}

/**
 * Resolve a universal link or custom-scheme URL into a navigation action for the native shell.
 */
export function resolveNativeDeepLinkAction(
  incomingUrl: string,
  allowedOrigins: string[],
  customSchemes: string[] = [APP_CUSTOM_URL_SCHEME],
): NativeDeepLinkAction {
  let parsed: URL;

  try {
    parsed = new URL(incomingUrl);
  } catch {
    return { type: "ignore" };
  }

  const customPath = normalizeCustomSchemePath(parsed, customSchemes);
  const pathname = customPath ?? parsed.pathname;
  const search = parsed.search ?? "";

  if (!customPath && !isAllowedOrigin(parsed, allowedOrigins)) {
    return { type: "ignore" };
  }

  const serverRoute = requiresServerRoute(pathname);

  if (!serverRoute && !isSupportedInAppPath(pathname)) {
    return { type: "ignore" };
  }

  const internalPath = `${pathname}${search}`;

  if (serverRoute) {
    if (customPath) {
      const origin =
        allowedOrigins.find(
          (candidate) => candidate.startsWith("https://") && !candidate.includes("localhost"),
        )?.replace(/\/$/, "") ?? "";
      return origin
        ? { type: "full-load", href: `${origin}${internalPath}` }
        : { type: "ignore" };
    }

    return { type: "full-load", href: parsed.toString() };
  }

  return { type: "client-navigate", path: internalPath };
}
