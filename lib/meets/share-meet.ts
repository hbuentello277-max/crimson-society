export function meetShareUrl(meetId: string) {
  if (typeof window === "undefined") {
    return `/meets?meet=${meetId}`;
  }

  const origin = window.location.origin.replace(/\/$/, "");
  return `${origin}/meets?meet=${meetId}`;
}

export function formatMeetRouteCopy(meetPoint: string, destination: string) {
  return `${meetPoint} → ${destination}`;
}

export async function copyTextToClipboard(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  throw new Error("Clipboard unavailable");
}

export async function shareMeetLink(input: { meetId: string; name: string; meetPoint: string }) {
  const url = meetShareUrl(input.meetId);
  const text = `${input.name} — ${input.meetPoint}`;

  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({ title: input.name, text, url });
    return { method: "share" as const };
  }

  await copyTextToClipboard(url);
  return { method: "copy" as const };
}
