import sharp from "sharp";
import {
  detectProductImageMimeType,
  MAX_PRODUCT_IMAGE_BYTES,
  type AllowedProductImageMimeType,
} from "@/lib/admin/product-image-upload";
import {
  DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS,
  parseProductImageNormalizeOptions,
  resolveProductImageBackgroundColor,
  type ProductImageNormalizeOptions,
} from "@/lib/admin/product-image-normalize-options";
import {
  STANDARD_PRODUCT_IMAGE_JPEG_QUALITY,
  STANDARD_PRODUCT_IMAGE_PADDING_RATIO,
} from "@/lib/product-images";

export type ProductImageUploadValidation =
  | { ok: true; buffer: Buffer; mimeType: AllowedProductImageMimeType }
  | { ok: false; error: string };

export type { ProductImageNormalizeOptions };

const TRIM_THRESHOLD = 8;
const MAX_TRIM_EDGE_RATIO = 0.15;
const MIN_TRIM_DIMENSION = 24;
const MIN_TRIM_AREA_RATIO = 0.85;
const WITHOUT_ENLARGEMENT_MIN_DIMENSION = 800;

async function productContentBuffer(
  input: Buffer,
  options: ProductImageNormalizeOptions,
): Promise<Buffer> {
  const background = resolveProductImageBackgroundColor(options.background);
  const content = await sharp(input)
    .rotate()
    .flatten({ background })
    .toBuffer();

  if (!options.trimEnabled) {
    return content;
  }

  const { width: fullW = 0, height: fullH = 0 } = await sharp(content).metadata();
  if (fullW === 0 || fullH === 0) {
    return content;
  }

  const fullArea = fullW * fullH;

  try {
    const trimmed = await sharp(content).trim({ threshold: TRIM_THRESHOLD }).toBuffer();
    const { width = 0, height = 0 } = await sharp(trimmed).metadata();
    const area = width * height;
    const trimW = 1 - width / fullW;
    const trimH = 1 - height / fullH;
    if (
      width >= MIN_TRIM_DIMENSION &&
      height >= MIN_TRIM_DIMENSION &&
      trimW <= MAX_TRIM_EDGE_RATIO &&
      trimH <= MAX_TRIM_EDGE_RATIO &&
      area >= fullArea * MIN_TRIM_AREA_RATIO
    ) {
      return trimmed;
    }
  } catch {
    // keep untrimmed content
  }

  return content;
}

export async function normalizeProductImageBuffer(
  input: Buffer,
  options: ProductImageNormalizeOptions = DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS,
): Promise<Buffer> {
  const size = options.canvasSize;
  const background = resolveProductImageBackgroundColor(options.background);
  const content = await productContentBuffer(input, options);
  const innerSize = Math.max(
    1,
    Math.floor(size * (1 - STANDARD_PRODUCT_IMAGE_PADDING_RATIO * 2)),
  );

  const { width: contentW = 0, height: contentH = 0 } = await sharp(content).metadata();
  const withoutEnlargement =
    options.fit === "inside" &&
    contentW >= WITHOUT_ENLARGEMENT_MIN_DIMENSION &&
    contentH >= WITHOUT_ENLARGEMENT_MIN_DIMENSION;

  const resized = await sharp(content)
    .rotate()
    .resize(innerSize, innerSize, {
      fit: options.fit === "cover" ? "cover" : "inside",
      withoutEnlargement,
    })
    .toBuffer();

  const { width = size, height = size } = await sharp(resized).metadata();
  const left = Math.floor((size - width) / 2);
  const top = Math.floor((size - height) / 2);

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background,
    },
  })
    .composite([{ input: resized, left, top }])
    .jpeg({ quality: STANDARD_PRODUCT_IMAGE_JPEG_QUALITY })
    .toBuffer();
}

export async function readAndValidateProductImageFile(
  file: File,
  options?: ProductImageNormalizeOptions,
): Promise<ProductImageUploadValidation> {
  if (file.size <= 0) {
    return { ok: false, error: "\uBE48 \uD30C\uC77C\uC740 \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." };
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      ok: false,
      error: "\uC774\uBBF8\uC9C0 \uD06C\uAE30\uB294 5MB \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.",
    };
  }

  let buffer: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch {
    return { ok: false, error: "\uD30C\uC77C\uC744 \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." };
  }

  if (buffer.length > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      ok: false,
      error: "\uC774\uBBF8\uC9C0 \uD06C\uAE30\uB294 5MB \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.",
    };
  }

  const mimeType = detectProductImageMimeType(new Uint8Array(buffer));
  if (!mimeType) {
    return {
      ok: false,
      error: "JPG, PNG, WEBP \uC774\uBBF8\uC9C0\uB9CC \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
    };
  }

  const normalizeOptions = options ?? DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS;

  let normalized: Buffer;
  try {
    normalized = await normalizeProductImageBuffer(buffer, normalizeOptions);
  } catch {
    return { ok: false, error: "\uC774\uBBF8\uC9C0\uB97C \uCC98\uB9AC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." };
  }

  if (normalized.length > MAX_PRODUCT_IMAGE_BYTES) {
    return {
      ok: false,
      error: "\uC774\uBBF8\uC9C0 \uD06C\uAE30\uB294 5MB \uC774\uD558\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.",
    };
  }

  return { ok: true, buffer: normalized, mimeType: "image/jpeg" };
}

export { parseProductImageNormalizeOptions };
