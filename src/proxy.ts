import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { getMaintenanceSettings, maintenanceExempt, maintenanceHtml, maintenanceLocale } from "@/lib/maintenance";
import { isMaintenanceAdmin } from "@/lib/supabase/middleware";
import { updateSession } from "@/lib/supabase/middleware";
import { createPublicClient } from "@/lib/supabase/service";
import publicCategorySlugs from "@/data/public-category-slugs.json";
import { isStorefrontNavSlug } from "@/lib/store/category-taxonomy";

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

  // Stop unknown categories before streaming starts so the response is a real 404.
  // Known categories take no extra database request. Newly added categories are checked live.
  const category = request.nextUrl.searchParams.get("category")?.trim();
  if (category && /^\/(?:[a-z]{2}\/)?products\/?$/.test(pathname) && !isStorefrontNavSlug(category) && !publicCategorySlugs.includes(category)) {
    const client = createPublicClient();
    if (client) {
      const result = await client.from("categories").select("slug").eq("is_active", true).eq("slug", category).limit(1);
      if (!result.error && result.data?.length === 0) {
        const prefix = pathname.split("/")[1];
        const locale = routing.locales.includes(prefix as typeof routing.locales[number]) ? prefix : routing.defaultLocale;
        return new NextResponse(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><title>Page not found · HMT KOREA</title></head><body style="font-family:system-ui;padding:48px;max-width:720px;margin:auto"><h1>Page not found</h1><p>This product category is not available.</p><a href="/${locale}/products">Browse products →</a></body></html>`, {status:404, headers:{"Content-Type":"text/html; charset=utf-8", "Cache-Control":"private, no-store", "X-Robots-Tag":"noindex, follow"}});
      }
    }
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
