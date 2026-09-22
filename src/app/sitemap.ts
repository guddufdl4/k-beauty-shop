import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { brandNameToSlug } from "@/lib/store/brand-url";
import { absoluteLocaleUrl } from "@/lib/site-url";
import { getProductBrands, getPublicProductSitemapRows } from "@/lib/supabase/products";

function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {
    "x-default": absoluteLocaleUrl(routing.defaultLocale, path),
  };
  for (const locale of routing.locales) {
    languages[locale] = absoluteLocaleUrl(locale, path);
  }
  return languages;
}

const STATIC_PATHS = [
  "",
  "/products",
  "/brands",
  "/categories",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/shipping",
  "/payment",
  "/returns",
  "/faq",
  "/order-guide",
  "/sitemap",
  "/wholesale-inquiry",
  "/login",
  "/signup",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of STATIC_PATHS) {
      entries.push({
        url: absoluteLocaleUrl(locale, path),
        lastModified: now,
        changeFrequency: path === "" || path === "/products" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.7,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  const [{ brands }, products] = await Promise.all([
    getProductBrands(),
    getPublicProductSitemapRows(),
  ]);

  const brandSlugs = [...new Set(brands.map((brand) => brandNameToSlug(brand)).filter(Boolean))];

  for (const locale of routing.locales) {
    for (const slug of brandSlugs) {
      const path = `/brands/${slug}`;
      entries.push({
        url: absoluteLocaleUrl(locale, path),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  for (const locale of routing.locales) {
    for (const product of products) {
      const path = `/products/${product.slug}`;
      entries.push({
        url: absoluteLocaleUrl(locale, path),
        lastModified: product.updated_at ? new Date(product.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.5,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  return entries;
}
