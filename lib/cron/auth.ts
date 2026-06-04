/** Shared secret auth for Vercel Cron and internal job routes. */
export function isCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.PUSH_DISPATCH_SECRET;
  if (!secret) {
    return false;
  }

  const headerSecret = request.headers.get("x-cron-secret");
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
