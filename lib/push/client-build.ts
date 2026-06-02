/** Bumped when push client/register flow changes — visible in PushNotificationSettings. */
export const PUSH_CLIENT_BUILD = process.env.NEXT_PUBLIC_PUSH_CLIENT_BUILD || "push-dev";

export const APP_BUILD_COMMIT =
  process.env.NEXT_PUBLIC_APP_BUILD_COMMIT?.slice(0, 7) || "local";

export const EXPECTED_PUSH_REGISTER_API_VERSION = 3;

export const EXPECTED_MIN_COMMIT_PREFIX = "019eaec";
