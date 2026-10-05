import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { getMaintenanceSettings, maintenanceExempt, maintenanceHtml, maintenanceLocale } from "@/lib/maintenance";
import { isMaintenanceAdmin } from "@/lib/supabase/middleware";
import { updateSession } from "@/lib/supabase/middleware";

const handleI18nRouting = createIntlMiddleware(routing);

function hasSupabaseAuthCookie(
  cookies: Array<{ name: string; value: string }>,
): boolean {
  return cookies.some(
    (cookie) =>
      cookie.name.includes("-auth-token") && Boolean(cookie.value?.trim()),
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!maintenanceExempt(pathname)) {
    const settings = await getMaintenanceSettings();
    if (settings.enabled) {
      const response = NextResponse.next({ request });
      const admin = hasSupabaseAuthCookie(request.cookies.getAll()) && await isMaintenanceAdmin(request, response);
      if (!admin) {
        const headers = { "Cache-Control": "private, no-store, max-age=0", "Retry-After": "300", "X-Robots-Tag": "noindex, nofollow" };
        const blocked = pathname.startsWith("/api/")
          ? NextResponse.json({ error: "maintenance", message: settings.message || "Site maintenance in progress" }, { status: 503, headers })
          : new NextResponse(maintenanceHtml(settings, maintenanceLocale(pathname)), { status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } });
        response.cookies.getAll().forEach((cookie) => blocked.cookies.set(cookie));
        return blocked;
      }
      const routed = pathname.startsWith("/api/") ? response : handleI18nRouting(request);
      response.cookies.getAll().forEach((cookie) => routed.cookies.set(cookie));
      return routed;
    }
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth")
  ) {
    return updateSession(request);
  }

  const intlResponse = handleI18nRouting(request);

  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    return intlResponse;
  }

  return updateSession(request, intlResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
