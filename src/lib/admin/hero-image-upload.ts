import sharp from "sharp";
import {
  detectProductImageMimeType,
  extensionForProductImageMime,
  MAX_PRODUCT_IMAGE_BYTES,
  type AllowedProductImageMimeType,
} from "@/lib/admin/product-image-upload";

export const HERO_IMAGE_BUCKET = "site-assets";

const HERO_MAX_WIDTH = 1920;
const HERO_JPEG_QUALITY = 85;

export function buildHeroImageStoragePath(mimeType: AllowedProductImageMimeType): string {
  const ext = extensionForProductImageMime(mimeType);
  return `hero/${crypto.randomUUID()}.${ext}`;
}

export type HeroImageValidation =
  | { ok: true; buffer: Buffer; mimeType: AllowedProductImageMimeType }
  | { ok: false; error: string };

export async function readAndValidateHeroImageFile(file: File): Promise<HeroImageValidation> {
  if (file.size <= 0) {
    return { ok: false, error: "빈 파일은 업로드할 수 없습니다." };
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return { ok: false, error: "이미지 크기는 5MB 이하여야 합니다." };
  }

  const input = Buffer.from(await file.arrayBuffer());
  const mimeType = detectProductImageMimeType(new Uint8Array(input));
  if (!mimeType) {
    return { ok: false, error: "JPG, PNG, WEBP 이미지만 업로드할 수 있습니다." };
  }

  try {
    const buffer = await sharp(input)
      .rotate()
      .resize({ width: HERO_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: HERO_JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return { ok: true, buffer, mimeType: "image/jpeg" };
  } catch {
    return { ok: false, error: "이미지를 처리하지 못했습니다." };
  }
}
