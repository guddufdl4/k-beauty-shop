import type { ProductImage } from "@/lib/supabase/products";

/** Square canvas size for normalized product images (upload + display). */
export const STANDARD_PRODUCT_IMAGE_SIZE = 1200;

/** JPEG quality when saving normalized product images. */
export const STANDARD_PRODUCT_IMAGE_JPEG_QUALITY = 85;

/** Background fill (zinc-50) for letterboxed product images. */
export const STANDARD_PRODUCT_IMAGE_BACKGROUND = { r: 250, g: 250, b: 250 };

/** Minimum inset on each edge of the square canvas (keeps product off the frame). */
export const STANDARD_PRODUCT_IMAGE_PADDING_RATIO = 0.04;

/** Public category placeholder assets (see public/images/categories/). */
export const CATEGORY_PLACEHOLDER_PATHS: Record<string, string> = {
  skincare: "/images/categories/skincare.svg",
  makeup: "/images/categories/makeup.svg",
  suncare: "/images/categories/suncare.svg",
  haircare: "/images/categories/haircare.svg",
  bodycare: "/images/categories/bodycare.svg",
  "tools-accessories": "/images/categories/tools-accessories.svg",
  "mask-pack": "/images/categories/mask-pack.svg",
  nail: "/images/categories/nail.svg",
  set: "/images/categories/set.svg",
  promotion: "/images/categories/promotion.svg",
};

export const DEFAULT_CATEGORY_PLACEHOLDER = "/images/categories/default.svg";

const SOURCE_ROW_IMAGE_KEYS = [
  "image_url",
  "imageurl",
  "image",
  "img",
  "photo",
  "picture",
];

const LOW_RES_PATH_PATTERNS = [
  /[_-](thumb|thumbnail|small|mini|tiny|xs|sm|preview|icon)([._-]|$)/i,
  /\/thumb(?:nail)?s?\//i,
];

export function getCategoryPlaceholderUrl(
  categorySlug: string | null | undefined,
): string {
  if (!categorySlug) {
    return DEFAULT_CATEGORY_PLACEHOLDER;
  }

  return CATEGORY_PLACEHOLDER_PATHS[categorySlug] ?? DEFAULT_CATEGORY_PLACEHOLDER;
}

export function isCategoryPlaceholderUrl(url: string): boolean {
  return url.startsWith("/images/categories/");
}

export type ProductImageSource = {
  id: string;
  name: string;
  image_url?: string | null;
  source_row?: Record<string, unknown> | null;
  category?: { slug: string } | null;
  images: ProductImage[];
};

function normalizeSourceRowKey(input: string): string {
  return input.toLowerCase().replace(/[\s_\-/()[\].\r\n]+/g, "");
}

function isHttpImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return false;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractSourceRowImageUrl(
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
    normalizedEntries.set(normalizeSourceRowKey(key), value);
  }

  for (const alias of SOURCE_ROW_IMAGE_KEYS) {
    const hit = normalizedEntries.get(normalizeSourceRowKey(alias));
    if (typeof hit === "string" && isHttpImageUrl(hit)) {
      return hit.trim();
    }
  }

  for (const value of normalizedEntries.values()) {
    if (typeof value === "string" && isHttpImageUrl(value)) {
      return value.trim();
    }
  }

  return null;
}

/** Remove Supabase transforms and common thumbnail URL patterns. */
export function normalizeProductImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || isCategoryPlaceholderUrl(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.pathname.includes("/storage/v1/render/image/public/")) {
      parsed.pathname = parsed.pathname.replace(
        "/storage/v1/render/image/public/",
        "/storage/v1/object/public/",
      );
      parsed.search = "";
      return parsed.toString();
    }

    for (const param of ["width", "height", "w", "h", "resize", "quality", "format"]) {
      parsed.searchParams.delete(param);
    }

    parsed.pathname = parsed.pathname
      .replace(/\/thumbnails?\//i, "/")
      .replace(/([/_-])thumb(?:nail)?s?([/_-])/gi, "$1$2")
      .replace(/([/_-])small([/_-])/gi, "$1$2")
      .replace(/([/_-])mini([/_-])/gi, "$1$2");

    const normalized = parsed.toString();
    return normalized.endsWith("?") ? normalized.slice(0, -1) : normalized;
  } catch {
    return trimmed;
  }
}

function parseDimensionParam(url: URL, ...keys: string[]): number {
  for (const key of keys) {
    const value = url.searchParams.get(key);
    if (!value) {
      continue;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

function scoreProductImageUrl(url: string): number {
  if (!url || isCategoryPlaceholderUrl(url)) {
    return -1;
  }

  const normalized = normalizeProductImageUrl(url);
  let score = 0;

  if (normalized.includes("/storage/v1/object/public/")) {
    score += 100;
  } else if (normalized.includes("/storage/v1/render/")) {
    score += 20;
  }

  for (const pattern of LOW_RES_PATH_PATTERNS) {
    if (pattern.test(normalized)) {
      score -= 50;
      break;
    }
  }

  try {
    const parsed = new URL(normalized);
    const maxDim = Math.max(
      parseDimensionParam(parsed, "width", "w", "resize", "size"),
      parseDimensionParam(parsed, "height", "h"),
    );

    if (maxDim > 0) {
      score += Math.min(maxDim, 2000);
    } else {
      score += Math.min(normalized.length, 120);
    }
  } catch {
    score += Math.min(normalized.length, 80);
  }

  return score;
}

export function isRealProductImageUrl(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed || isCategoryPlaceholderUrl(trimmed)) {
    return false;
  }

  return true;
}

/** DB/import helper: true when no real product image exists in known fields. */
export function resolveNeedsImageFromFields(input: {
  image_url?: string | null;
  source_row?: Record<string, unknown> | null;
  images?: Array<{ url: string }>;
}): boolean {
  if (input.images?.some((image) => isRealProductImageUrl(image.url))) {
    return false;
  }

  if (isRealProductImageUrl(input.image_url)) {
    return false;
  }

  if (isRealProductImageUrl(extractSourceRowImageUrl(input.source_row))) {
    return false;
  }

  return true;
}

/** True when the product has a real image URL (not category placeholder only). */
export function productHasRealImage(product: ProductImageSource): boolean {
  return collectProductImageCandidates(product).some((url) =>
    isRealProductImageUrl(url),
  );
}

function collectProductImageCandidates(product: ProductImageSource): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  const add = (raw: string | null | undefined) => {
    const trimmed = raw?.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }

    seen.add(trimmed);
    candidates.push(trimmed);
  };

  for (const image of product.images) {
    add(image.url);
  }

  add(product.image_url);
  add(extractSourceRowImageUrl(product.source_row));

  return candidates;
}

/** Pick the highest-resolution-looking URL from all known product image sources. */
export function resolveBestProductImageUrl(product: ProductImageSource): string {
  const candidates = collectProductImageCandidates(product);
  if (candidates.length === 0) {
    return getCategoryPlaceholderUrl(product.category?.slug);
  }

  let best = candidates[0]!;
  let bestScore = scoreProductImageUrl(best);

  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index]!;
    const score = scoreProductImageUrl(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return normalizeProductImageUrl(best);
}

/** Prefer the best available image URL, then category placeholder. */
export function resolveProductImageUrl(product: ProductImageSource): string {
  const candidates = collectProductImageCandidates(product);
  if (candidates.length > 0) {
    return resolveBestProductImageUrl(product);
  }

  return getCategoryPlaceholderUrl(product.category?.slug);
}

export function enrichProductImages<T extends ProductImageSource>(product: T): T {
  const bestUrl = resolveProductImageUrl(product);

  if (product.images.length === 0) {
    return {
      ...product,
      images: [
        {
          id: `placeholder-${product.id}`,
          product_id: product.id,
          url: bestUrl,
          alt_text: product.name,
          sort_order: 0,
          is_primary: true,
        },
      ],
    };
  }

  const primaryIndex = product.images.findIndex((image) => image.is_primary);
  const index = primaryIndex >= 0 ? primaryIndex : 0;
  const primary = product.images[index]!;

  if (primary.url === bestUrl) {
    return product;
  }

  const images = product.images.map((image, imageIndex) =>
    imageIndex === index ? { ...image, url: bestUrl } : image,
  );

  return {
    ...product,
    images,
  };
}
