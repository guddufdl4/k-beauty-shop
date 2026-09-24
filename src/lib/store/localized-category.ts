import type { Category } from "@/lib/supabase/products";
import {
  flattenTaxonomyLabels,
  isStorefrontNavSlug,
  STOREFRONT_NAV_SLUGS,
} from "@/lib/store/category-taxonomy";

/** English display names keyed by category slug (DB names are often Korean). */
export const CATEGORY_EN_NAMES: Record<string, string> = {
  skincare: "Skincare",
  makeup: "Makeup",
  suncare: "Suncare",
  haircare: "Hair Care",
  bodycare: "Body Care",
  "body-care": "Body Care",
  "tools-accessories": "Tools & Accessories",
  "mask-pack": "Mask Pack",
  nail: "Nail",
  set: "Set Menu",
  promotion: "Promotions",
  ...Object.fromEntries(
    Object.entries(flattenTaxonomyLabels()).map(([slug, labels]) => [slug, labels.en]),
  ),
};

const TAXONOMY_LABELS = flattenTaxonomyLabels();

export function getEnglishCategoryName(category: Pick<Category, "name" | "slug">): string {
  const mapped = CATEGORY_EN_NAMES[category.slug];
  if (mapped) {
    return mapped;
  }
  const name = category.name.trim();
  if (name && !/[\u3131-\u318e\uac00-\ud7a3]/i.test(name)) {
    return name;
  }
  return category.slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getLocalizedCategoryName(
  category: Pick<Category, "name" | "slug">,
  locale: string,
): string {
  const labels = TAXONOMY_LABELS[category.slug];
  if (labels) {
    if (locale === "ko") return labels.ko;
    if (locale === "ja") return labels.ja;
    if (locale === "zh") return labels.zh;
    return labels.en;
  }

  if (locale === "ko") {
    return category.name;
  }
  return getEnglishCategoryName(category);
}

export function localizeCategories(categories: Category[], locale: string): Category[] {
  const keepKoreanCopy = locale === "ko" || locale.startsWith("ko-");
  return categories.map((category) => {
    const description = category.description?.trim() || "";
    const hideHangulDescription =
      !keepKoreanCopy && /[\u3131-\u318e\uac00-\ud7a3]/i.test(description);
    return {
      ...category,
      name: getLocalizedCategoryName(category, locale),
      description: hideHangulDescription ? "" : category.description,
    };
  });
}

export function getCategorySortLocale(locale: string): string {
  if (locale === "ko") return "ko";
  if (locale === "ja") return "ja";
  if (locale === "zh") return "zh";
  return "en";
}

export function compareCategoriesByDisplayName(
  a: Pick<Category, "name">,
  b: Pick<Category, "name">,
  locale: string,
): number {
  return a.name.localeCompare(b.name, getCategorySortLocale(locale), {
    sensitivity: "base",
    numeric: true,
  });
}

/** True when name/slug looks like a barcode accidentally imported as a category. */
export function isBarcodeLikeCategory(
  category: Pick<Category, "name" | "slug">,
): boolean {
  const slug = category.slug.trim();
  const name = category.name.trim();
  return /^\d{8,}$/.test(slug) || /^\d{8,}$/.test(name);
}

export function filterStorefrontCategories(categories: Category[]): Category[] {
  return categories.filter((category) => !isBarcodeLikeCategory(category));
}

export function isStorefrontNavCategory(category: Pick<Category, "slug">): boolean {
  return isStorefrontNavSlug(category.slug);
}

export function pickStorefrontNavCategories(categories: Category[]): Category[] {
  const visible = filterStorefrontCategories(categories);
  const bySlug = new Map(visible.map((category) => [category.slug, category]));
  const ordered: Category[] = [];

  for (const slug of STOREFRONT_NAV_SLUGS) {
    const category = bySlug.get(slug);
    if (category) {
      ordered.push(category);
    }
  }

  return ordered;
}
