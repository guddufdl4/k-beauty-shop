import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { resolveSiteUrl } from "@/lib/site-url";
import {
  getPublicProductSitemapCount,
  SITEMAP_PRODUCTS_PER_FILE,
} from "@/lib/supabase/products";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = resolveSiteUrl();
  const privateLocalePaths = routing.locales.flatMap((locale) => [
    `/${locale}/account`,
    `/${locale}/checkout`,
    `/${locale}/cart`,
    `/${locale}/login`,
    `/${locale}/signup`,
    `/${locale}/orders`,
  ]);

  const productCount = await getPublicProductSitemapCount();
  const productChunks = Math.ceil(productCount / SITEMAP_PRODUCTS_PER_FILE);
  const sitemaps = [
    `${siteUrl}/sitemap-index.xml`,
    ...Array.from(
      { length: 1 + productChunks },
      (_, id) => `${siteUrl}/sitemap/${id}.xml`,
    ),
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/account",
          "/checkout",
          "/cart",
          "/login",
          "/signup",
          "/orders",
          ...privateLocalePaths,
        ],
      },
    ],
    sitemap: sitemaps,
    host: siteUrl,
  };
}
