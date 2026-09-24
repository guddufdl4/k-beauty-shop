import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { STOREFRONT_NAV_SLUGS } from "@/lib/store/category-taxonomy";
import { brandNameToSlug } from "@/lib/store/brand-url";
import { buildProductsHref } from "@/lib/store/products-url";
import { absoluteLocaleUrl } from "@/lib/site-url";
import {
  getProductBrands,
  getPublicProductSitemapCount,
  getPublicProductSitemapRows,
  SITEMAP_PRODUCTS_PER_FILE,
} from "@/lib/supabase/products";

function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {
    "x-default": absoluteLocaleUrl(routing.defaultLocale, path),
  };
  for (const locale of routing.locales) {
    languages[locale] = absoluteLocaleUrl(locale, path);
  }
  return languages;
}

function localizedEntries(
  path: string,
  options?: { lastModified?: Date; changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]; priority?: number },
): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: absoluteLocaleUrl(locale, path),
    ...(options?.lastModified ? { lastModified: options.lastModified } : {}),
    changeFrequency: options?.changeFrequency,
    priority: options?.priority,
    alternates: { languages: languageAlternates(path) },
  }));
}

const STATIC_PATHS: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/products", changeFrequency: "daily", priority: 0.8 },
  { path: "/brands", changeFrequency: "weekly", priority: 0.8 },
  { path: "/categories", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/shipping", changeFrequency: "monthly", priority: 0.4 },
  { path: "/payment", changeFrequency: "monthly", priority: 0.4 },
  { path: "/returns", changeFrequency: "monthly", priority: 0.3 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.4 },
  { path: "/order-guide", changeFrequency: "monthly", priority: 0.5 },
  { path: "/wholesale-inquiry", changeFrequency: "monthly", priority: 0.5 },
];

async function pagesSitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const item of STATIC_PATHS) {
    entries.push(
      ...localizedEntries(item.path, {
        changeFrequency: item.changeFrequency,
        priority: item.priority,
      }),
    );
  }

  for (const slug of STOREFRONT_NAV_SLUGS) {
    entries.push(
      ...localizedEntries(buildProductsHref({ category: slug }), {
        changeFrequency: "daily",
        priority: 0.7,
      }),
    );
  }

  const { brands } = await getProductBrands();
  const brandSlugs = [...new Set(brands.map((brand) => brandNameToSlug(brand)).filter(Boolean))];

  for (const slug of brandSlugs) {
    entries.push(
      ...localizedEntries(`/brands/${slug}`, {
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    );
  }

  return entries;
}

async function productsSitemap(chunkIndex: number): Promise<MetadataRoute.Sitemap> {
  const products = await getPublicProductSitemapRows({
    offset: chunkIndex * SITEMAP_PRODUCTS_PER_FILE,
    limit: SITEMAP_PRODUCTS_PER_FILE,
  });

  const entries: MetadataRoute.Sitemap = [];
  for (const product of products) {
    const path = `/products/${product.slug}`;
    const lastModified = product.updated_at ? new Date(product.updated_at) : undefined;
    const validLastModified =
      lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : undefined;
    entries.push(
      ...localizedEntries(path, {
        lastModified: validLastModified,
        changeFrequency: "weekly",
        priority: 0.5,
      }),
    );
  }
  return entries;
}

export async function generateSitemaps() {
  const productCount = await getPublicProductSitemapCount();
  const productChunks = Math.ceil(productCount / SITEMAP_PRODUCTS_PER_FILE);
  return Array.from({ length: 1 + productChunks }, (_, id) => ({ id }));
}

export default async function sitemap(props: {
  id?: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const rawId = props.id ? await props.id : "0";
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id < 0) {
    return [];
  }
  if (id === 0) {
    return pagesSitemap();
  }
  return productsSitemap(id - 1);
}
