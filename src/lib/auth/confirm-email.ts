import { escapeHtml } from "@/lib/email";
import { PUBLIC_STORE_NAME } from "@/lib/site-url";

export function buildSignupConfirmEmail(input: {
  fullName: string;
  confirmUrl: string;
}): { subject: string; html: string; text: string } {
  const name = input.fullName.trim() || "there";
  const subject = `Confirm your ${PUBLIC_STORE_NAME} wholesale account`;
  const text = [
    `Hi ${name},`,
    "",
    `Thanks for creating a wholesale buyer account with ${PUBLIC_STORE_NAME}.`,
    "Please confirm your email address to finish signing up:",
    input.confirmUrl,
    "",
    "If you did not request this account, you can ignore this email.",
    "",
    PUBLIC_STORE_NAME,
    "Authentic K-Beauty wholesale, supplied directly from Korea.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px 28px;">
          <tr>
            <td>
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#e11d48;">${escapeHtml(PUBLIC_STORE_NAME)}</p>
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">Confirm your email address</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(name)},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                Thanks for creating a wholesale buyer account with ${escapeHtml(PUBLIC_STORE_NAME)}.
                Confirm this email to finish signing up and view export pricing.
              </p>
              <p style="margin:0 0 28px;">
                <a href="${escapeHtml(input.confirmUrl)}" style="display:inline-block;background:#e11d48;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:15px;font-weight:bold;">
                  Confirm email address
                </a>
              </p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#52525b;">
                If the button does not work, copy and paste this link into your browser:<br />
                ${escapeHtml(input.confirmUrl)}
              </p>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#71717a;">
                This message was sent by ${escapeHtml(PUBLIC_STORE_NAME)} because you started a wholesale signup.
                If you did not request this, you can ignore the email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
