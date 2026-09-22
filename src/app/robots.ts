import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { resolveSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();
  const privateLocalePaths = routing.locales.flatMap((locale) => [
    `/${locale}/account`,
    `/${locale}/checkout`,
    `/${locale}/cart`,
  ]);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/account", "/checkout", "/cart", ...privateLocalePaths],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
