export const QUOTE_INQUIRY_RECIPIENTS = [
  "jessicajung@hanmitrd.com",
  "johnkim@hanmitrd.com",
  "guddufdlehsqjfwk@naver.com",
] as const;

function quoteInquiryRecipients(): string[] {
  const extras = (process.env.QUOTE_INQUIRY_TO ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...QUOTE_INQUIRY_RECIPIENTS.map((value) => value.toLowerCase()), ...extras])];
}

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
  const replyTo = input.replyTo?.trim().toLowerCase();
  const to = [
    ...quoteInquiryRecipients(),
    ...(replyTo ? [replyTo] : []),
  ].filter((value, index, list) => list.indexOf(value) === index);

  if (to.length === 0) {
    return { ok: false, error: "email_not_configured" };
  }

  let delivered = 0;
  for (const recipient of to) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [recipient],
          subject: input.subject,
          html: input.html,
          text: input.text,
          reply_to: input.replyTo || undefined,
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        console.error("[email] Resend failed:", recipient, response.status, detail.slice(0, 400));
        continue;
      }

      delivered += 1;
    } catch (error) {
      console.error("[email] Resend request error:", recipient, error);
    }
  }

  if (delivered === 0) {
    return { ok: false, error: "email_send_failed" };
  }

  return { ok: true };
}
