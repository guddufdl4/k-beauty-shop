import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { resolveAuthEmailBaseUrl } from "@/lib/site-url";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return `/${routing.defaultLocale}/account`;
  }
  return value;
}

function destination(nextPath: string): URL {
  return new URL(nextPath, `${resolveAuthEmailBaseUrl()}/`);
}

const HASH_BOOT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirming HMT Korea account</title>
</head>
<body style="font-family:Arial,sans-serif;padding:48px 20px;text-align:center;color:#18181b;">
  <p>Confirming your HMT Korea account…</p>
  <script>
    (async function () {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      const next = new URLSearchParams(window.location.search).get("next") || "/en/account";
      if (access_token && refresh_token) {
        const response = await fetch("/auth/callback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ access_token: access_token, refresh_token: refresh_token })
        });
        if (response.ok) {
          window.location.replace(next);
          return;
        }
      }
      window.location.replace("/en/login?error=confirm");
    })();
  </script>
</body>
</html>`;

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const supabase = await createClient();

  if (tokenHash && rawType && OTP_TYPES.has(rawType as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: rawType as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(destination(`${nextPath}?verified=1`));
    }
    return NextResponse.redirect(destination(`/${routing.defaultLocale}/login?error=confirm`));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(destination(`${nextPath}?verified=1`));
    }
    return NextResponse.redirect(destination(`/${routing.defaultLocale}/login?error=confirm`));
  }

  return new NextResponse(HASH_BOOT_HTML, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
  } | null;
  const accessToken = body?.access_token?.trim();
  const refreshToken = body?.refresh_token?.trim();
  if (!accessToken || !refreshToken) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
