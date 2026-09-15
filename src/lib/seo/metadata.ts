import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";
import { PUBLIC_STORE_NAME, absoluteLocaleUrl, resolveSiteUrl } from "@/lib/site-url";

const GOOGLE_LISTING_SEO = {
  title: `${PUBLIC_STORE_NAME} | Authentic K-Beauty Wholesale`,
  description:
    "Authentic K-Beauty wholesale, supplied directly from Korea. Discover a wide range of Korean beauty brands at competitive prices.",
} as const;

export const STOREFRONT_SEO: Record<AppLocale, { title: string; description: string }> = {
  en: GOOGLE_LISTING_SEO,
  ko: GOOGLE_LISTING_SEO,
  ja: GOOGLE_LISTING_SEO,
  zh: GOOGLE_LISTING_SEO,
};

export function buildStorefrontMetadata(options: {
  locale: string;
  path?: string;
  title?: string;
  description?: string;
  ogImage?: string | null;
}): Metadata {
  const locale = (routing.locales.includes(options.locale as AppLocale)
    ? options.locale
    : routing.defaultLocale) as AppLocale;
  const seo = STOREFRONT_SEO[locale];
  const path = options.path ?? "";
  const canonical = absoluteLocaleUrl(locale, path);
  const title = options.title ?? seo.title;
  const description = options.description ?? seo.description;
  const siteUrl = resolveSiteUrl();
  const languages: Record<string, string> = {
    "x-default": absoluteLocaleUrl(routing.defaultLocale, path),
  };
  for (const entry of routing.locales) {
    languages[entry] = absoluteLocaleUrl(entry, path);
  }

  const ogImage = options.ogImage?.trim() || null;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: PUBLIC_STORE_NAME,
      title,
      description,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}
