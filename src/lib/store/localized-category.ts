import type { Category } from "@/lib/supabase/products";

/** English display names keyed by category slug (DB names are often Korean). */
const CATEGORY_EN_NAMES: Record<string, string> = {
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

export function getLocalizedCategoryName(
  category: Pick<Category, "name" | "slug">,
  locale: string,
): string {
  if (locale === "ko") {
    return category.name;
  }
  return CATEGORY_EN_NAMES[category.slug] ?? category.name;
}

export function localizeCategories(categories: Category[], locale: string): Category[] {
  return categories.map((category) => ({
    ...category,
    name: getLocalizedCategoryName(category, locale),
  }));
}

export function getCategorySortLocale(locale: string): string {
  return locale === "ko" ? "ko" : "en";
}