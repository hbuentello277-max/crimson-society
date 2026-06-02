/** Authorize push cron / webhook callers. */
export function isPushDispatchAuthorized(request: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const headerSecret = request.headers.get("x-push-dispatch-secret");
  if (headerSecret === secret) {
    return true;
  }

  const bearer = request.headers.get("authorization");
  const bearerSecret = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;
  if (bearerSecret === secret) {
    return true;
  }

  return false;
}
