import {
  STANDARD_PRODUCT_IMAGE_BACKGROUND,
  STANDARD_PRODUCT_IMAGE_SIZE,
} from "@/lib/product-images";

export type ProductImageNormalizeFit = "inside" | "cover";
export type ProductImageNormalizeBackground = "white" | "zinc";

export type ProductImageNormalizeOptions = {
  canvasSize: number;
  fit: ProductImageNormalizeFit;
  background: ProductImageNormalizeBackground;
  trimEnabled: boolean;
};

export const PRODUCT_IMAGE_CANVAS_SIZES = [800, 1000, 1200] as const;

export const DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS: ProductImageNormalizeOptions = {
  canvasSize: STANDARD_PRODUCT_IMAGE_SIZE,
  fit: "inside",
  background: "zinc",
  trimEnabled: true,
};

export const PRODUCT_IMAGE_UPLOAD_SETTINGS_STORAGE_KEY =
  "kbeauty-admin-product-image-upload-settings";

const BACKGROUND_COLORS: Record<
  ProductImageNormalizeBackground,
  { r: number; g: number; b: number }
> = {
  white: { r: 255, g: 255, b: 255 },
  zinc: STANDARD_PRODUCT_IMAGE_BACKGROUND,
};

export function resolveProductImageBackgroundColor(
  background: ProductImageNormalizeBackground,
): { r: number; g: number; b: number } {
  return BACKGROUND_COLORS[background];
}

export function parseProductImageNormalizeOptions(
  input: Record<string, FormDataEntryValue | string | number | boolean | undefined | null>,
): ProductImageNormalizeOptions {
  const defaults = DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS;

  const canvasRaw = String(input.canvasSize ?? "").trim();
  const parsedCanvas = Number.parseInt(canvasRaw, 10);
  const canvasSize = PRODUCT_IMAGE_CANVAS_SIZES.includes(
    parsedCanvas as (typeof PRODUCT_IMAGE_CANVAS_SIZES)[number],
  )
    ? parsedCanvas
    : defaults.canvasSize;

  const fitRaw = String(input.fit ?? "").trim();
  const fit: ProductImageNormalizeFit =
    fitRaw === "cover" || fitRaw === "inside" ? fitRaw : defaults.fit;

  const backgroundRaw = String(input.background ?? "").trim();
  const background: ProductImageNormalizeBackground =
    backgroundRaw === "white" || backgroundRaw === "zinc"
      ? backgroundRaw
      : defaults.background;

  const trimRaw = String(input.trimEnabled ?? "").trim().toLowerCase();
  const trimEnabled =
    trimRaw === "true" || trimRaw === "1" || trimRaw === "on"
      ? true
      : trimRaw === "false" || trimRaw === "0" || trimRaw === "off"
        ? false
        : defaults.trimEnabled;

  return { canvasSize, fit, background, trimEnabled };
}

export function loadProductImageUploadSettings(): ProductImageNormalizeOptions {
  if (typeof window === "undefined") {
    return DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS;
  }

  try {
    const raw = window.localStorage.getItem(PRODUCT_IMAGE_UPLOAD_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS;
    }

    const parsed = JSON.parse(raw) as Partial<ProductImageNormalizeOptions>;
    return parseProductImageNormalizeOptions(parsed);
  } catch {
    return DEFAULT_PRODUCT_IMAGE_NORMALIZE_OPTIONS;
  }
}

export function saveProductImageUploadSettings(
  options: ProductImageNormalizeOptions,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      PRODUCT_IMAGE_UPLOAD_SETTINGS_STORAGE_KEY,
      JSON.stringify(options),
    );
  } catch {
    // ignore quota / private mode errors
  }
}

export function appendProductImageNormalizeOptionsToFormData(
  formData: FormData,
  options: ProductImageNormalizeOptions,
): void {
  formData.append("canvasSize", String(options.canvasSize));
  formData.append("fit", options.fit);
  formData.append("background", options.background);
  formData.append("trimEnabled", options.trimEnabled ? "true" : "false");
}