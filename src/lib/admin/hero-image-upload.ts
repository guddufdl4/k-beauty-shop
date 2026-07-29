import sharp, { type Sharp } from "sharp";
import { HERO_IMAGE_RECOMMENDED } from "@/lib/admin/hero-image-spec";
import {
  detectProductImageMimeType,
  extensionForProductImageMime,
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_BUCKET,
  type AllowedProductImageMimeType,
} from "@/lib/admin/product-image-upload";

/** Hero backgrounds live under `hero/` in the shared product-images bucket. */
export const HERO_IMAGE_BUCKET = PRODUCT_IMAGE_BUCKET;

const HERO_MAX_WIDTH = HERO_IMAGE_RECOMMENDED.width;
const HERO_TARGET_HEIGHT = HERO_IMAGE_RECOMMENDED.height;
const HERO_WEBP_QUALITY = 90;

/** Parse `hero/…` object path from a Supabase public storage URL, if present. */
export function parseHeroStoragePathFromPublicUrl(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(hero\/[^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function buildHeroImageStoragePath(mimeType: AllowedProductImageMimeType): string {
  const ext = extensionForProductImageMime(mimeType);
  return `hero/${crypto.randomUUID()}.${ext}`;
}

export type HeroImageValidation =
  | { ok: true; buffer: Buffer; mimeType: AllowedProductImageMimeType }
  | { ok: false; error: string };

async function encodeHeroImagePipeline(
  pipeline: Sharp,
  mimeType: AllowedProductImageMimeType,
): Promise<{ buffer: Buffer; mimeType: AllowedProductImageMimeType } | null> {
  let buffer: Buffer;
  let outputMimeType: AllowedProductImageMimeType;

  if (mimeType === "image/png") {
    buffer = await pipeline.png({ compressionLevel: 3, effort: 7 }).toBuffer();
    outputMimeType = "image/png";
  } else if (mimeType === "image/webp") {
    buffer = await pipeline.webp({ quality: HERO_WEBP_QUALITY, effort: 4 }).toBuffer();
    outputMimeType = "image/webp";
  } else {
    buffer = await pipeline.webp({ quality: HERO_WEBP_QUALITY, effort: 4 }).toBuffer();
    outputMimeType = "image/webp";
  }

  const detected = detectProductImageMimeType(new Uint8Array(buffer));
  if (!detected) {
    return null;
  }

  return { buffer, mimeType: outputMimeType };
}

export async function optimizeHeroImageBuffer(input: Buffer): Promise<HeroImageValidation> {
  const mimeType = detectProductImageMimeType(new Uint8Array(input));
  if (!mimeType) {
    return { ok: false, error: "JPG, PNG, WEBP 이미지만 처리할 수 있습니다." };
  }

  try {
    const pipeline = sharp(input)
      .rotate()
      .resize({
        width: HERO_MAX_WIDTH,
        height: HERO_TARGET_HEIGHT,
        fit: "cover",
        position: "centre",
        kernel: sharp.kernel.lanczos3,
      });

    const encoded = await encodeHeroImagePipeline(pipeline, mimeType);
    if (!encoded) {
      return { ok: false, error: "이미지 처리 후 형식을 확인하지 못했습니다." };
    }

    if (encoded.buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
      return { ok: false, error: "처리된 이미지 크기가 5MB를 초과합니다." };
    }

    return { ok: true, buffer: encoded.buffer, mimeType: encoded.mimeType };
  } catch {
    return { ok: false, error: "이미지를 권장 크기로 맞추지 못했습니다." };
  }
}

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
    const pipeline = sharp(input)
      .rotate()
      .resize({
        width: HERO_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3,
      });

    const encoded = await encodeHeroImagePipeline(pipeline, mimeType);
    if (!encoded) {
      return { ok: false, error: "이미지 처리 후 형식을 확인하지 못했습니다." };
    }

    return { ok: true, buffer: encoded.buffer, mimeType: encoded.mimeType };
  } catch {
    return { ok: false, error: "이미지를 처리하지 못했습니다." };
  }
}
