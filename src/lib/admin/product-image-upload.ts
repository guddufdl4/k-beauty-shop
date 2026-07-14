export const PRODUCT_IMAGE_BUCKET = "product-images";

export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_PRODUCT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedProductImageMimeType =
  (typeof ALLOWED_PRODUCT_IMAGE_MIME_TYPES)[number];

const MIME_TO_EXT: Record<AllowedProductImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedProductImageMimeType(
  value: string,
): value is AllowedProductImageMimeType {
  return (ALLOWED_PRODUCT_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

function hasJpegMagicBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function hasPngMagicBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function hasWebpMagicBytes(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

/** Detect image type from file header (not client-provided MIME). */
export function detectProductImageMimeType(
  bytes: Uint8Array,
): AllowedProductImageMimeType | null {
  if (hasJpegMagicBytes(bytes)) {
    return "image/jpeg";
  }
  if (hasPngMagicBytes(bytes)) {
    return "image/png";
  }
  if (hasWebpMagicBytes(bytes)) {
    return "image/webp";
  }
  return null;
}

export function extensionForProductImageMime(
  mimeType: AllowedProductImageMimeType,
): string {
  return MIME_TO_EXT[mimeType];
}

export function buildProductImageStoragePath(
  productId: string,
  mimeType: AllowedProductImageMimeType,
): string {
  const ext = extensionForProductImageMime(mimeType);
  return `${productId}/${crypto.randomUUID()}.${ext}`;
}

const EXT_TO_MIME: Record<string, AllowedProductImageMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function mimeTypeFromFilename(name: string): AllowedProductImageMimeType | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) {
    return null;
  }

  return EXT_TO_MIME[ext] ?? null;
}

export function resolveClientProductImageMimeType(file: File): AllowedProductImageMimeType | null {
  if (isAllowedProductImageMimeType(file.type)) {
    return file.type;
  }

  return mimeTypeFromFilename(file.name);
}

/** Read multipart file entry (File or Blob) from admin upload FormData. */
export function readProductImageUploadEntry(
  entry: FormDataEntryValue | null,
): File | null {
  if (!entry || typeof entry === "string") {
    return null;
  }

  if (!(entry instanceof File) || entry.size <= 0) {
    return null;
  }

  return entry;
}

export function validateClientProductImageFile(file: File): string | null {
  if (file.size <= 0) {
    return "빈 파일은 업로드할 수 없습니다.";
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    return "이미지 크기는 5MB 이하여야 합니다.";
  }

  if (!resolveClientProductImageMimeType(file)) {
    return "JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.";
  }

  return null;
}

function fileFromClipboardItem(item: DataTransferItem): File | null {
  if (item.kind !== "file") {
    return null;
  }

  const blob = item.getAsFile();
  if (!blob || blob.size <= 0) {
    return null;
  }

  const mimeType = isAllowedProductImageMimeType(blob.type)
    ? blob.type
    : item.type && isAllowedProductImageMimeType(item.type)
      ? item.type
      : null;

  if (!mimeType) {
    return null;
  }

  const ext = extensionForProductImageMime(mimeType);
  return new File([blob], `paste-${Date.now()}.${ext}`, { type: mimeType });
}

/** Extract the first allowed image file from a clipboard paste payload. */
export function extractProductImageFileFromClipboard(
  data: DataTransfer,
): File | null {
  for (const item of data.items) {
    const file = fileFromClipboardItem(item);
    if (file) {
      return file;
    }
  }

  for (const file of data.files) {
    if (isAllowedProductImageMimeType(file.type)) {
      const ext = extensionForProductImageMime(file.type);
      return new File([file], `paste-${Date.now()}.${ext}`, { type: file.type });
    }
  }

  return null;
}
