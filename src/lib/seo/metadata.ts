import type { Metadata } from "next";
import { routing, indexedLocales, isIndexedLocale, type AppLocale } from "@/i18n/routing";
import { getHomeSeo } from "@/lib/seo/catalog-copy";
import { INDEX_FOLLOW, SEO_BRAND_NAME } from "@/lib/seo/constants";
import { PUBLIC_STORE_NAME, absoluteLocaleUrl, resolveSiteUrl } from "@/lib/site-url";

const OG_LOCALE: Record<AppLocale, string> = {
  en: "en_US",
  ko: "ko_KR",
  ja: "ja_JP",
  zh: "zh_CN",
  vi: "vi_VN",
  id: "id_ID",
  th: "th_TH",
  ru: "ru_RU", kk: "kk_KZ", uz: "uz_UZ", ky: "ky_KG", tg: "tg_TJ", tk: "tk_TM",
};

/** Legacy alias used by older call sites; homepage English listing copy. */
export const GOOGLE_LISTING_SEO = {
  title: getHomeSeo("en").title,
  description: getHomeSeo("en").description,
} as const;

export const STOREFRONT_SEO: Record<AppLocale, { title: string; description: string }> = {
  en: { title: getHomeSeo("en").title, description: getHomeSeo("en").description },
  ko: { title: getHomeSeo("ko").title, description: getHomeSeo("ko").description },
  ja: { title: getHomeSeo("ja").title, description: getHomeSeo("ja").description },
  zh: { title: getHomeSeo("zh").title, description: getHomeSeo("zh").description },
  vi: { title: getHomeSeo("vi").title, description: getHomeSeo("vi").description },
  id: { title: getHomeSeo("id").title, description: getHomeSeo("id").description },
  th: { title: getHomeSeo("th").title, description: getHomeSeo("th").description },
  ru: { title: getHomeSeo("ru").title, description: getHomeSeo("ru").description },
  kk: { title: getHomeSeo("kk").title, description: getHomeSeo("kk").description },
  uz: { title: getHomeSeo("uz").title, description: getHomeSeo("uz").description },
  ky: { title: getHomeSeo("ky").title, description: getHomeSeo("ky").description },
  tg: { title: getHomeSeo("tg").title, description: getHomeSeo("tg").description },
  tk: { title: getHomeSeo("tk").title, description: getHomeSeo("tk").description },
};

function resolveLocale(value: string): AppLocale {
  return routing.locales.includes(value as AppLocale) ? (value as AppLocale) : routing.defaultLocale;
}

function withBrandSuffix(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return `${SEO_BRAND_NAME} | Korean Cosmetics Wholesale`;
  }
  if (/hmt\s*korea/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} | ${SEO_BRAND_NAME}`;
}

function googleSiteVerification(): Metadata["verification"] {
  const code =
    process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  if (!code) {
    return undefined;
  }
  return { google: code };
}

export function buildStorefrontMetadata(options: {
  locale: string;
  path?: string;
  canonicalPath?: string;
  title?: string;
  description?: string;
  ogImage?: string | null;
  robots?: Metadata["robots"];
}): Metadata {
  const locale = resolveLocale(options.locale);
  const defaults = STOREFRONT_SEO[locale];
  const hrefPath = options.canonicalPath ?? options.path ?? "";
  const canonical = absoluteLocaleUrl(locale, hrefPath);
  const title = options.title?.trim() ? withBrandSuffix(options.title) : defaults.title;
  const description = options.description?.trim() || defaults.description;
  const siteUrl = resolveSiteUrl();
  const languages: Record<string, string> = {
    "x-default": absoluteLocaleUrl(routing.defaultLocale, hrefPath),
  };
  for (const entry of indexedLocales) {
    languages[entry] = absoluteLocaleUrl(entry, hrefPath);
  }

  const ogImage = options.ogImage?.trim() || null;
  const alternateLocale = indexedLocales
    .filter((entry) => entry !== locale)
    .map((entry) => OG_LOCALE[entry]);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    verification: googleSiteVerification(),
    robots: isIndexedLocale(locale) ? options.robots ?? INDEX_FOLLOW : { index: false, follow: true },
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale,
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
