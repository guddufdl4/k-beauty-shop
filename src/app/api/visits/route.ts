import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import {
  VISITOR_COOKIE,
  isLikelyBot,
  normalizeVisitPath,
  recordStorefrontVisit,
} from "@/lib/admin/visits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent");
  if (isLikelyBot(userAgent)) {
    return new NextResponse(null, { status: 204 });
  }

  const { profile } = await getSessionProfile();
  if (profile?.role === "admin") {
    return new NextResponse(null, { status: 204 });
  }

  let path = "";
  try {
    const body = (await request.json()) as { path?: string };
    path = String(body.path ?? "");
  } catch {
    path = "";
  }

  const normalized = normalizeVisitPath(path);
  if (!normalized) {
    return new NextResponse(null, { status: 204 });
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE)?.value?.trim() || "";
  const visitorKey = existing || randomUUID();

  await recordStorefrontVisit({ path: normalized, visitorKey });

  const response = new NextResponse(null, { status: 204 });
  if (!existing) {
    response.cookies.set(VISITOR_COOKIE, visitorKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}
