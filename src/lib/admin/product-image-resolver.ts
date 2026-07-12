import { CANONICAL_CATEGORY_NAMES } from "@/lib/admin/hanmi-category-map";
import { getCategoryPlaceholderUrl as getLocalCategoryPlaceholder } from "@/lib/product-images";

const SOURCE_ROW_IMAGE_KEYS = [
  "image_url",
  "imageurl",
  "image",
  "\uB300\uD45C\uC774\uBBF8\uC9C0",
  "\uC774\uBBF8\uC9C0",
  "img",
  "thumbnail",
  "photo",
  "picture",
];

function normalizeSourceKey(input: string): string {
  return input.toLowerCase().replace(/[\s_\-/()[\].\r\n]+/g, "");
}

export function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** http(s) URL or site-relative path (e.g. category placeholders). */
export function isValidProductImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }

  return isValidHttpUrl(trimmed);
}

function coerceUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return isValidHttpUrl(trimmed) ? trimmed : null;
}

export function extractImageUrlFromSourceRow(
  sourceRow: Record<string, unknown> | null | undefined,
): string | null {
  if (!sourceRow) {
    return null;
  }

  const normalizedEntries = new Map<string, unknown>();
  for (const [key, value] of Object.entries(sourceRow)) {
    if (key.startsWith("__")) {
      continue;
    }
    normalizedEntries.set(normalizeSourceKey(key), value);
  }

  for (const alias of SOURCE_ROW_IMAGE_KEYS) {
    const hit = normalizedEntries.get(normalizeSourceKey(alias));
    const url = coerceUrl(hit);
    if (url) {
      return url;
    }
  }

  for (const value of normalizedEntries.values()) {
    const url = coerceUrl(value);
    if (url && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) {
      return url;
    }
  }

  return null;
}

export function getCategoryPlaceholderUrl(
  categorySlug: string | null | undefined,
): string {
  return getLocalCategoryPlaceholder(categorySlug);
}

export function getCategoryDisplayName(
  categorySlug: string | null | undefined,
): string {
  if (!categorySlug) {
    return "K-Beauty";
  }

  return CANONICAL_CATEGORY_NAMES[categorySlug] ?? categorySlug;
}

export type ImageResolveSource =
  | "source_row"
  | "category_placeholder"
  | "category_image";

export type ResolvedProductImage = {
  url: string;
  source: ImageResolveSource;
};

export function resolveProductImage(input: {
  sourceRow: Record<string, unknown> | null | undefined;
  categorySlug: string | null | undefined;
  categoryImageUrl: string | null | undefined;
}): ResolvedProductImage {
  const fromSourceRow = extractImageUrlFromSourceRow(input.sourceRow);
  if (fromSourceRow) {
    return { url: fromSourceRow, source: "source_row" };
  }

  const categoryImage = coerceUrl(input.categoryImageUrl ?? "");
  if (categoryImage) {
    return { url: categoryImage, source: "category_image" };
  }

  return {
    url: getCategoryPlaceholderUrl(input.categorySlug),
    source: "category_placeholder",
  };
}