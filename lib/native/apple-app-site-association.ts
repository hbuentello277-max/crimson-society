import { APP_ASSOCIATED_HOSTS, APP_BUNDLE_ID } from "@/lib/native/app-domains";

/** Universal link path patterns opened by the native iOS shell. */
export const UNIVERSAL_LINK_PATHS = [
  "/auth/callback*",
  "/reset-password",
  "/forgot",
  "/login",
  "/signup",
  "/inbox*",
  "/messages*",
  "/notifications*",
  "/meets*",
  "/dashboard*",
  "/profile/*",
  "/connect/requests/*",
  "/checkout/success*",
  "/shop/checkout/success*",
  "/blackcard*",
] as const;

export type AppleAppSiteAssociation = {
  applinks: {
    apps: string[];
    details: Array<{
      appIDs?: string[];
      paths: readonly string[];
      comment?: string;
    }>;
  };
};

export function buildAppleAppSiteAssociation(teamId?: string | null): AppleAppSiteAssociation {
  const normalizedTeamId = teamId?.trim() || process.env.APPLE_TEAM_ID?.trim() || null;

  if (normalizedTeamId) {
    return {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [`${normalizedTeamId}.${APP_BUNDLE_ID}`],
            paths: UNIVERSAL_LINK_PATHS,
          },
        ],
      },
    };
  }

  return {
    applinks: {
      apps: [],
      details: [
        {
          paths: UNIVERSAL_LINK_PATHS,
          comment:
            "Set APPLE_TEAM_ID in production so Apple can associate com.crimsonsociety.app with this domain.",
        },
      ],
    },
  };
}

export function getAssociatedApplinkDomains() {
  return APP_ASSOCIATED_HOSTS.map((host) => `applinks:${host}`);
}
