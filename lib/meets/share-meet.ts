export async function shareMeetLink(meetId: string, meetName: string) {
  if (typeof window === "undefined") {
    return { ok: false as const, error: "Share is only available in the browser." };
  }

  const url = `${window.location.origin}/meets?meet=${encodeURIComponent(meetId)}`;

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: meetName, text: `Join ${meetName} on Crimson Society`, url });
      return { ok: true as const };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { ok: true as const, canceled: true };
      }
    }
  }

  if (typeof navigator.clipboard?.writeText === "function") {
    await navigator.clipboard.writeText(url);
    return { ok: true as const, copied: true };
  }

  return { ok: false as const, error: "Could not share this meet." };
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
