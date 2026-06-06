export function getRequestIpAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || null;
}

export function getRequestUserAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}
