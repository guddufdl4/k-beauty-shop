import { routing } from "@/i18n/routing";
import type { HeroSlide, HeroSlideCopy } from "@/types/database";

/** Default storefront entry (matches routing.defaultLocale, currently /en). */
export function storefrontHref(path: string = ""): string {
  const suffix = path
    ? path.startsWith("/")
      ? path
      : `/${path}`
    : "";
  return `/${routing.defaultLocale}${suffix}`;
}

/** Default hero secondary CTA — next-intl resolves to `/{locale}/wholesale-inquiry`. */
export const DEFAULT_WHOLESALE_INQUIRY_HREF = "/wholesale-inquiry";

export function isExternalHeroHref(href: string): boolean {
  return /^https:\/\//i.test(href.trim());
}

const BLOCKED_HERO_LINK_PROTOCOL =
  /^(javascript|data|file|vbscript):/i;

const HERO_LINK_CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

export type HeroLinkValidationResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

export type HeroSlideLinkField = "button_link" | "wholesale_link";

export type HeroSlideValidationError = {
  slideIndex: number;
  slideId: string;
  field: HeroSlideLinkField;
  message: string;
};

/** Validate admin/storefront hero CTA links. Empty input is allowed (uses fallback). */
export function validateHeroLinkInput(raw: string | null | undefined): HeroLinkValidationResult {
  if (raw == null) {
    return { ok: true, value: null };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  if (HERO_LINK_CONTROL_CHARS.test(trimmed)) {
    return { ok: false, error: "링크에 허용되지 않는 문자가 포함되어 있습니다." };
  }

  if (BLOCKED_HERO_LINK_PROTOCOL.test(trimmed)) {
    return { ok: false, error: "허용되지 않는 링크 형식입니다." };
  }

  if (/^https:\/\//i.test(trimmed)) {
    return { ok: true, value: trimmed };
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return { ok: false, error: "외부 링크는 https:// 로 시작해야 합니다." };
  }

  if (trimmed.startsWith("/")) {
    return { ok: true, value: trimmed };
  }

  return {
    ok: false,
    error: "내부 링크는 / 로 시작하거나, 외부 링크는 https:// 로 시작해야 합니다.",
  };
}

export function validateHeroSlideCopyLinks(copy: HeroSlideCopy | undefined): {
  button_link?: string;
  wholesale_link?: string;
} {
  const errors: { button_link?: string; wholesale_link?: string } = {};

  if (copy?.button_link != null && copy.button_link !== "") {
    const result = validateHeroLinkInput(copy.button_link);
    if (!result.ok) {
      errors.button_link = result.error;
    }
  }

  if (copy?.wholesale_link != null && copy.wholesale_link !== "") {
    const result = validateHeroLinkInput(copy.wholesale_link);
    if (!result.ok) {
      errors.wholesale_link = result.error;
    }
  }

  return errors;
}

/** Trim copy fields and normalize link values before persistence. */
export function sanitizeHeroSlideCopy(copy: HeroSlideCopy | undefined): HeroSlideCopy | undefined {
  if (!copy) {
    return undefined;
  }

  const buttonLinkResult = validateHeroLinkInput(copy.button_link);
  const wholesaleLinkResult = validateHeroLinkInput(copy.wholesale_link);

  const sanitized: HeroSlideCopy = {
    ...copy,
    button_link:
      buttonLinkResult.ok && buttonLinkResult.value ? buttonLinkResult.value : null,
    wholesale_link:
      wholesaleLinkResult.ok && wholesaleLinkResult.value ? wholesaleLinkResult.value : null,
    wholesale_label: copy.wholesale_label?.trim() || null,
  };

  const hasValue = Object.entries(sanitized).some(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  return hasValue ? sanitized : undefined;
}

/** Validate all slide CTA links before save. Returns sanitized slides when valid. */
export function validateHeroSlidesForSave(
  slides: HeroSlide[],
): { ok: true; slides: HeroSlide[] } | { ok: false; errors: HeroSlideValidationError[] } {
  const errors: HeroSlideValidationError[] = [];
  const sanitizedSlides: HeroSlide[] = [];

  slides.forEach((slide, slideIndex) => {
    const copy = slide.copy;

    if (copy) {
      for (const field of ["button_link", "wholesale_link"] as const) {
        const raw = copy[field];
        if (raw != null && raw !== "") {
          const result = validateHeroLinkInput(raw);
          if (!result.ok) {
            errors.push({
              slideIndex,
              slideId: slide.id,
              field,
              message: result.error,
            });
          }
        }
      }
    }

    const sanitizedCopy = sanitizeHeroSlideCopy(copy);
    sanitizedSlides.push({
      ...slide,
      ...(sanitizedCopy ? { copy: sanitizedCopy } : {}),
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, slides: sanitizedSlides };
}

/** Normalize admin paths for next-intl (strip locale prefix; preserve external URLs). */
export function normalizeHeroHref(raw: string | null | undefined, fallback: string): string {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) {
    return fallback;
  }

  if (isExternalHeroHref(trimmed)) {
    return trimmed;
  }

  const localePrefixed = trimmed.match(/^\/(en|ko|ja|zh)(\/.*)?$/);
  if (localePrefixed) {
    return localePrefixed[2] || "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export type HeroBannerCopyOverride = {
  badge?: string | null;
  title?: string;
  description?: string;
  shopBestSellersLabel?: string;
  shopBestSellersHref?: string;
  wholesaleInquiryLabel?: string;
  wholesaleInquiryHref?: string;
};

export function mapHeroSlideCopyToBannerCopy(
  slideCopy: HeroSlideCopy | undefined,
): HeroBannerCopyOverride | undefined {
  if (!slideCopy) {
    return undefined;
  }

  const mapped: HeroBannerCopyOverride = {};

  if (slideCopy.badge !== undefined) {
    mapped.badge = slideCopy.badge;
  }
  if (slideCopy.title?.trim()) {
    mapped.title = slideCopy.title.trim();
  }
  if (slideCopy.subtitle?.trim()) {
    mapped.description = slideCopy.subtitle.trim();
  }
  if (slideCopy.button_text?.trim()) {
    mapped.shopBestSellersLabel = slideCopy.button_text.trim();
  }
  if (slideCopy.button_link?.trim()) {
    mapped.shopBestSellersHref = normalizeHeroHref(slideCopy.button_link, "");
  }
  if (slideCopy.wholesale_label?.trim()) {
    mapped.wholesaleInquiryLabel = slideCopy.wholesale_label.trim();
  }
  if (slideCopy.wholesale_link?.trim()) {
    mapped.wholesaleInquiryHref = normalizeHeroHref(slideCopy.wholesale_link, "");
  }

  return Object.keys(mapped).length > 0 ? mapped : undefined;
}
