import {
  buildMeetPublicUrl,
  buildMeetShareText,
  resolveMeetShareOrigin,
} from "@/lib/meets/meet-public-url";

export type ShareMeetInput = {
  meetId: string;
  meetName: string;
  hostName: string;
  origin?: string | null;
};

export function buildMeetPublicSharePayload(input: ShareMeetInput) {
  const url = buildMeetPublicUrl(input.meetId, input.origin);
  const text = buildMeetShareText(input.meetName, input.hostName, url);

  return {
    url,
    text,
    title: input.meetName,
  };
}

export async function shareMeetLink(input: ShareMeetInput) {
  if (typeof window === "undefined") {
    return { ok: false as const, error: "Share is only available in the browser." };
  }

  const payload = buildMeetPublicSharePayload({
    ...input,
    origin: input.origin ?? resolveMeetShareOrigin(),
  });

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return { ok: true as const };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { ok: true as const, canceled: true };
      }
    }
  }

  return { ok: false as const, error: "Native share is unavailable on this device." };
}

export async function copyMeetLink(input: Pick<ShareMeetInput, "meetId" | "origin">) {
  if (typeof window === "undefined") {
    return { ok: false as const, error: "Copy link is only available in the browser." };
  }

  const url = buildMeetPublicUrl(input.meetId, input.origin ?? resolveMeetShareOrigin());

  if (typeof navigator.clipboard?.writeText !== "function") {
    return { ok: false as const, error: "Could not copy this meet link." };
  }

  try {
    await navigator.clipboard.writeText(url);
    return { ok: true as const, url };
  } catch {
    return { ok: false as const, error: "Could not copy this meet link." };
  }
}

export function buildMeetRouteCopyText(meet: {
  meetPoint: string;
  destination: string;
  distance?: string | null;
  duration?: string | null;
}) {
  const summary = `${meet.meetPoint} → ${meet.destination}`;
  const stats = [meet.distance, meet.duration].filter(Boolean).join(" · ");
  return stats ? `${summary}\n${stats}` : summary;
}
