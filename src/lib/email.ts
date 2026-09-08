export const QUOTE_INQUIRY_RECIPIENTS = [
  "jessicajung@hanmitrd.com",
  "johnkim@hanmitrd.com",
] as const;

const DEFAULT_FROM = "HMT Korea <onboarding@resend.dev>";

export function isQuoteMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type SendEmailInput = {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export async function sendQuoteInquiryEmail(input: SendEmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "email_not_configured" };
  }

  const from = process.env.RESEND_FROM?.trim() || DEFAULT_FROM;
  const toOverride = process.env.QUOTE_INQUIRY_TO?.trim();
  const to = toOverride
    ? toOverride.split(",").map((value) => value.trim()).filter(Boolean)
    : [...QUOTE_INQUIRY_RECIPIENTS];

  if (to.length === 0) {
    return { ok: false, error: "email_not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo || undefined,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[email] Resend failed:", response.status, detail.slice(0, 500));
      return { ok: false, error: "email_send_failed" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[email] Resend request error:", error);
    return { ok: false, error: "email_send_failed" };
  }
}
