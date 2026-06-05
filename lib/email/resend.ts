export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

const RESEND_API_URL = "https://api.resend.com/emails";

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}

/**
 * Sends via Resend HTTP API. Does not throw when env is missing (local dev safety).
 */
export async function sendResendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    console.warn(
      "[email] Skipping send — set RESEND_API_KEY and RESEND_FROM_EMAIL to enable transactional email.",
      { subject: input.subject, to: input.to },
    );
    return { ok: false, skipped: true, reason: "resend_not_configured" };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
      }),
    });

    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };

    if (!res.ok) {
      const message = body.message ?? `Resend API error (${res.status})`;
      console.error("[email] Resend send failed", message);
      return { ok: false, skipped: false, error: message };
    }

    if (!body.id) {
      return { ok: false, skipped: false, error: "Resend did not return a message id" };
    }

    return { ok: true, id: body.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown email error";
    console.error("[email] Resend request failed", message);
    return { ok: false, skipped: false, error: message };
  }
}
