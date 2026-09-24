import { collapseRepeatedBrandPrefix } from "@/lib/store/product-copy";
import { hangulProductNameToEnglish } from "@/lib/store/hangul-product-english";

type NamedProduct = {
  name: string;
  brand?: string | null;
  sku?: string | null;
  description?: string | null;
  short_description?: string | null;
  name_en?: string | null;
  name_ko?: string | null;
  source_row?: Record<string, unknown> | null;
};

const HANGUL = /[\u3131-\u318e\uac00-\ud7a3]/i;

export function containsHangul(text: string): boolean {
  return HANGUL.test(text);
}

function normalizeHeaderKey(header: string): string {
  return header
    .replace(/__\d+$/, "")
    .replace(/[\r\n]+/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "");
}

function isLatinName(text: string): boolean {
  const trimmed = text.trim();
  return Boolean(trimmed) && /[A-Za-z]/.test(trimmed) && !containsHangul(trimmed);
}

function cleanName(value: string, brand?: string | null): string {
  return collapseRepeatedBrandPrefix(value.replace(/\s+/g, " ").trim(), brand);
}

function isNameHeader(normalized: string): boolean {
  if (!normalized) return false;
  if (normalized === "제품명" || normalized === "상품명" || normalized === "name" || normalized === "product") {
    return true;
  }
  return (
    normalized.includes("productname") ||
    normalized.includes("productkr") ||
    normalized.includes("producteng") ||
    normalized.includes("productkor") ||
    /namekr|nameen|namekor|nameeng/.test(normalized)
  );
}

function classifyNameHeader(
  header: string,
  indexAmongMatches: number,
  totalMatches: number,
): "english" | "korean" | "neutral" {
  const base = normalizeHeaderKey(header);
  const pairedGeneric =
    base === "productname" ||
    base === "name" ||
    base === "product" ||
    base === "제품명" ||
    base === "상품명";

  if (pairedGeneric && totalMatches >= 2) {
    return indexAmongMatches === 0 ? "korean" : "english";
  }

  const koreanHint =
    base === "kr" ||
    /korean|kor\b|국문|namekr|productkr|productnamekr|상품명|제품명/.test(base) ||
    (base.endsWith("kr") && !base.includes("eng"));
  const englishHint =
    base === "en" ||
    /english|eng\b|nameen|producten|productnameen|producteng/.test(base) ||
    (base.endsWith("en") && !koreanHint);

  if (englishHint && !koreanHint) return "english";
  if (koreanHint && !englishHint) return "korean";
  return "neutral";
}

function pickBetter(current: string | null, next: string): string {
  if (!current) return next;
  return next.length > current.length ? next : current;
}

export function resolveProductNamePair(product: NamedProduct): { en: string | null; ko: string | null } {
  let en: string | null = product.name_en?.trim() || null;
  let ko: string | null = product.name_ko?.trim() || null;
  const brand = product.brand ?? null;
  const source = product.source_row;

  if (source && typeof source === "object") {
    const nameEntries = Object.entries(source).filter(([key, value]) => {
      if (typeof value !== "string" && typeof value !== "number") return false;
      return isNameHeader(normalizeHeaderKey(key));
    });

    nameEntries.forEach(([header, raw], index) => {
      const value = cleanName(String(raw ?? ""), brand);
      if (!value) return;
      const kind = classifyNameHeader(header, index, nameEntries.length);
      const latin = isLatinName(value);
      const hangul = containsHangul(value);
      if (latin) {
        en = pickBetter(en, value);
      }
      if (hangul) {
        ko = pickBetter(ko, value);
      }
      if (!latin && !hangul) {
        if (kind === "english") en = pickBetter(en, value);
        if (kind === "korean") ko = pickBetter(ko, value);
      }
    });

    if (!en || !ko) {
      for (const [key, raw] of Object.entries(source)) {
        if (key === "__sheet") continue;
        if (typeof raw !== "string") continue;
        const value = cleanName(raw, brand);
        if (!value || value.length < 3) continue;
        if (!en && isLatinName(value) && /\s/.test(value)) en = value;
        if (!ko && containsHangul(value)) ko = value;
      }
    }
  }

  const stored = cleanName(product.name, brand);
  if (stored) {
    if (!ko && containsHangul(stored)) ko = stored;
    if (!en && isLatinName(stored)) en = stored;
  }

  return {
    en: en ? cleanName(en, brand) : null,
    ko: ko ? cleanName(ko, brand) : null,
  };
}

export function isKoreanLocale(locale: string): boolean {
  return locale === "ko" || locale.startsWith("ko-");
}

/** Hide Hangul catalog copy on non-Korean storefront locales. */
export function storefrontTextForLocale(
  text: string | null | undefined,
  locale: string,
): string | null {
  const value = text?.replace(/\s+/g, " ").trim() || null;
  if (!value) {
    return null;
  }
  if (isKoreanLocale(locale) || !containsHangul(value)) {
    return value;
  }
  return null;
}

function latinNameFallback(product: NamedProduct): string {
  const brand = product.brand?.trim() || "";
  const stored = cleanName(product.name, brand);
  if (stored && !containsHangul(stored)) {
    return stored;
  }

  const source = stored || product.name;
  if (source && containsHangul(source)) {
    const translated = hangulProductNameToEnglish(source, brand);
    if (translated && isLatinName(translated)) {
      return cleanName(translated, brand);
    }
    if (translated) {
      const stripped = cleanName(translated.replace(/[\u3131-\u318e\uac00-\ud7a3]+/g, " "), brand);
      if (stripped && isLatinName(stripped)) {
        return stripped;
      }
    }
  }

  if (brand && !containsHangul(brand)) {
    return brand;
  }
  return "K-Beauty product";
}

export function getLocalizedProductName(product: NamedProduct, locale: string): string {
  const { en, ko } = resolveProductNamePair(product);
  if (isKoreanLocale(locale)) {
    return ko || product.name;
  }
  return en || latinNameFallback(product);
}

function isVolumeHeader(normalized: string): boolean {
  if (!normalized || normalized.includes("inbox") || normalized.includes("outbox")) {
    return false;
  }
  if (
    normalized === "gml" ||
    normalized === "ml" ||
    normalized === "volume" ||
    normalized === "용량" ||
    normalized === "netwt" ||
    normalized === "netweight" ||
    normalized === "capacity" ||
    normalized === "netcontent" ||
    normalized === "contentsize"
  ) {
    return true;
  }
  return normalized.includes("volume") || normalized.endsWith("용량");
}

function formatVolumeValue(raw: string, headerNormalized: string): string | null {
  const trimmed = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed === "0" || trimmed === "-" || trimmed === ".") {
    return null;
  }
  if (trimmed.length > 48) {
    return null;
  }
  if (/\d+(?:[.,]\d+)?\s*(ml|㎖|g|kg|oz|fl\.?\s*oz|l|ℓ|mg|ea|pcs)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) {
    const amount = trimmed.replace(",", ".");
    if (headerNormalized.includes("ml") || headerNormalized === "gml") {
      return `${amount}ml`;
    }
    if (headerNormalized === "g" || headerNormalized.endsWith("gram")) {
      return `${amount}g`;
    }
    return `${amount}ml`;
  }
  return looksLikeVolumeLabel(trimmed) ? trimmed : null;
}

function volumeFromProductName(product: NamedProduct): string | null {
  for (const text of [product.short_description, product.name, product.name_en, product.name_ko]) {
    const match = String(text ?? "").match(
      /(\d+(?:[.,]\d+)?\s*(?:ml|㎖|g|kg|oz|fl\.?\s*oz|l|ℓ))\b/i,
    );
    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }
  return null;
}

function looksLikeVolumeLabel(value: string): boolean {
  if (!value || value.length > 48) {
    return false;
  }
  if (/\d+(?:[.,]\d+)?\s*(ml|㎖|g|kg|oz|fl\.?\s*oz|l|ℓ|mg|ea|pcs)/i.test(value)) {
    return true;
  }
  return /^\d+(?:[.,]\d+)?$/.test(value);
}

export function extractProductVolume(product: NamedProduct): string | null {
  const stored = product.short_description?.trim() || "";
  if (stored && looksLikeVolumeLabel(stored)) {
    return formatVolumeValue(stored, "gml") ?? stored;
  }

  const source = product.source_row;
  if (source && typeof source === "object") {
    for (const [header, raw] of Object.entries(source)) {
      if (header.startsWith("__")) {
        continue;
      }
      const normalized = normalizeHeaderKey(header);
      if (!isVolumeHeader(normalized)) {
        continue;
      }
      const formatted = formatVolumeValue(String(raw ?? ""), normalized);
      if (formatted) {
        return formatted;
      }
    }
  }

  return volumeFromProductName(product);
}

export function getLocalizedProductDescription(product: NamedProduct, locale: string): string | null {
  return storefrontTextForLocale(product.description, locale);
}

export function withLocalizedNameFields<T extends NamedProduct>(
  product: T,
): T & { name_en: string | null; name_ko: string | null; short_description: string | null } {
  const { en, ko } = resolveProductNamePair(product);
  return {
    ...product,
    name_en: en,
    name_ko: ko,
    short_description: extractProductVolume(product),
  };
}

export function localizeStorefrontProduct<T extends NamedProduct>(product: T, locale: string): T {
  const images = (product as T & { images?: Array<{ alt_text?: string | null }> }).images;
  return {
    ...product,
    name: getLocalizedProductName(product, locale),
    name_ko: isKoreanLocale(locale) ? product.name_ko ?? null : null,
    description: getLocalizedProductDescription(product, locale),
    ingredients: storefrontTextForLocale(
      (product as T & { ingredients?: string | null }).ingredients,
      locale,
    ),
    how_to_use: storefrontTextForLocale(
      (product as T & { how_to_use?: string | null }).how_to_use,
      locale,
    ),
    country_of_origin: storefrontTextForLocale(
      (product as T & { country_of_origin?: string | null }).country_of_origin,
      locale,
    ),
    meta_title: storefrontTextForLocale(
      (product as T & { meta_title?: string | null }).meta_title,
      locale,
    ),
    meta_description: storefrontTextForLocale(
      (product as T & { meta_description?: string | null }).meta_description,
      locale,
    ),
    ...(images
      ? {
          images: images.map((image) => ({
            ...image,
            alt_text: storefrontTextForLocale(image.alt_text, locale),
          })),
        }
      : {}),
  };
}

export function localizeStorefrontProducts<T extends NamedProduct>(products: T[], locale: string): T[] {
  return products.map((product) => localizeStorefrontProduct(product, locale));
}

export function omitProductSourceRow<T extends { source_row?: Record<string, unknown> | null }>(
  product: T,
): T {
  return { ...product, source_row: null };
}
