import { MAX_PRODUCT_IMAGE_BYTES } from "@/lib/admin/product-image-upload";

/** Recommended hero dimensions shown in admin UI. */
export const HERO_IMAGE_RECOMMENDED = {
  width: 1920,
  height: 600,
  retinaWidth: 3840,
  maxBytes: MAX_PRODUCT_IMAGE_BYTES,
} as const;

export function formatHeroImageRecommendation(): string {
  return `${HERO_IMAGE_RECOMMENDED.width}×${HERO_IMAGE_RECOMMENDED.height}px (또는 ${HERO_IMAGE_RECOMMENDED.retinaWidth}×720px, 최대 5MB)`;
}
