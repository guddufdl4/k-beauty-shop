const ASIAN_CATEGORY_LABELS: Record<string, string[]> = {"Skincare": ["Chăm sóc da", "Perawatan kulit", "ดูแลผิว"], "Makeup": ["Trang điểm", "Riasan", "เครื่องสำอาง"], "Suncare": ["Chống nắng", "Perawatan matahari", "กันแดด"], "Hair Care": ["Chăm sóc tóc", "Perawatan rambut", "ดูแลเส้นผม"], "Body Care": ["Chăm sóc cơ thể", "Perawatan tubuh", "ดูแลผิวกาย"], "Mask Pack": ["Mặt nạ", "Masker", "มาสก์"], "Tools & Accessories": ["Dụng cụ và phụ kiện", "Alat & aksesori", "อุปกรณ์และเครื่องมือ"], "Nail": ["Móng tay", "Kuku", "เล็บ"], "Set Menu": ["Bộ sản phẩm", "Set produk", "ชุดผลิตภัณฑ์"], "Promotions": ["Khuyến mãi", "Promosi", "โปรโมชั่น"], "Skin/Toner": ["Nước cân bằng", "Toner", "โทนเนอร์"], "Lotion/Emulsion": ["Sữa dưỡng", "Losion/Emulsi", "โลชั่น/อิมัลชัน"], "Essence/Serum/Ampoule": ["Tinh chất/Serum/Ampoule", "Esens/Serum/Ampul", "เอสเซนส์/เซรั่ม/แอมพูล"], "Cream": ["Kem dưỡng", "Krim", "ครีม"], "Moisture Cream": ["Kem dưỡng ẩm", "Krim pelembap", "ครีมให้ความชุ่มชื้น"], "Nutrition Cream": ["Kem dưỡng bổ sung", "Krim nutrisi", "ครีมบำรุง"], "Basic Sets": ["Bộ chăm sóc cơ bản", "Set perawatan dasar", "ชุดดูแลผิวพื้นฐาน"], "Eye Care": ["Chăm sóc mắt", "Perawatan mata", "ดูแลรอบดวงตา"], "Cleansing": ["Làm sạch", "Pembersih", "ทำความสะอาด"], "Sun Care": ["Chống nắng", "Perawatan matahari", "กันแดด"], "Base": ["Trang điểm nền", "Riasan dasar", "เมคอัพเบส"], "Lip": ["Môi", "Bibir", "ริมฝีปาก"], "Eye": ["Mắt", "Mata", "ดวงตา"], "Cheek": ["Má", "Pipi", "แก้ม"], "Sheet Mask": ["Mặt nạ giấy", "Masker lembaran", "ชีตมาสก์"], "Sleeping Mask": ["Mặt nạ ngủ", "Masker tidur", "สลีปปิ้งมาสก์"], "Wash-off Pack": ["Mặt nạ rửa", "Masker bilas", "มาสก์ล้างออก"], "Sunscreen": ["Kem chống nắng", "Tabir surya", "ครีมกันแดด"], "Sun Stick": ["Chống nắng dạng thỏi", "Tabir surya stik", "กันแดดแบบแท่ง"], "After Sun": ["Chăm sóc sau nắng", "Perawatan setelah matahari", "ดูแลผิวหลังออกแดด"], "Shampoo": ["Dầu gội", "Sampo", "แชมพู"], "Treatment": ["Dưỡng tóc", "Perawatan rambut", "ทรีตเมนต์"], "Styling": ["Tạo kiểu tóc", "Penataan rambut", "จัดแต่งทรงผม"], "Body Wash": ["Sữa tắm", "Sabun mandi", "ผลิตภัณฑ์อาบน้ำ"], "Body Lotion": ["Sữa dưỡng thể", "Losion tubuh", "โลชั่นบำรุงผิวกาย"], "Hand & Foot": ["Tay và chân", "Tangan & kaki", "มือและเท้า"]};
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
  const index = ["vi", "id", "th"].indexOf(locale);
  const asian = ASIAN_CATEGORY_LABELS[getEnglishCategoryName(category)];
  if (index >= 0 && asian) return asian[index];
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
  if (["vi", "id", "th"].includes(locale)) return locale;
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
