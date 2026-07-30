import type { Category } from "@/lib/supabase/products";

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
  set: "Sets",
  promotion: "Promotions",
};

export function getEnglishCategoryName(category: Pick<Category, "name" | "slug">): string {
  return CATEGORY_EN_NAMES[category.slug] ?? category.name;
}

export function getLocalizedCategoryName(
  category: Pick<Category, "name" | "slug">,
  locale: string,
): string {
  if (locale === "ko") {
    return category.name;
  }
  return getEnglishCategoryName(category);
}

export function localizeCategories(categories: Category[], locale: string): Category[] {
  return categories.map((category) => ({
    ...category,
    name: getLocalizedCategoryName(category, locale),
  }));
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