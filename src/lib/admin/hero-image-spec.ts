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

export type HeroLayoutAnchorX = "left" | "center" | "right";
export type HeroLayoutAnchorY = "top" | "center" | "bottom";
export type HeroTextAlign = "left" | "center" | "right";
export type HeroImageFocus = "left" | "center" | "right";

export type HeroSlideLayoutPreset = {
  alignX: HeroLayoutAnchorX;
  alignY: HeroLayoutAnchorY;
  offsetX: number;
  offsetY: number;
  maxWidth: number;
  titleColor: string;
  descriptionColor: string;
  titleSizePx: number;
  descriptionSizePx: number;
  textAlign: HeroTextAlign;
  gradientStrength: number;
  imageFocus: HeroImageFocus;
};

export type HeroSlideLayout = {
  desktop?: Partial<HeroSlideLayoutPreset>;
  mobile?: Partial<HeroSlideLayoutPreset>;
};

export const DEFAULT_HERO_DESKTOP_LAYOUT: HeroSlideLayoutPreset = {
  alignX: "left",
  alignY: "center",
  offsetX: 48,
  offsetY: 0,
  maxWidth: 520,
  titleColor: "#18181b",
  descriptionColor: "#52525b",
  titleSizePx: 40,
  descriptionSizePx: 18,
  textAlign: "left",
  gradientStrength: 70,
  imageFocus: "center",
};

export const DEFAULT_HERO_MOBILE_LAYOUT: HeroSlideLayoutPreset = {
  alignX: "left",
  alignY: "bottom",
  offsetX: 16,
  offsetY: 16,
  maxWidth: 320,
  titleColor: "#18181b",
  descriptionColor: "#52525b",
  titleSizePx: 24,
  descriptionSizePx: 14,
  textAlign: "left",
  gradientStrength: 80,
  imageFocus: "center",
};

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseAnchorX(value: unknown, fallback: HeroLayoutAnchorX): HeroLayoutAnchorX {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function parseAnchorY(value: unknown, fallback: HeroLayoutAnchorY): HeroLayoutAnchorY {
  return value === "top" || value === "center" || value === "bottom" ? value : fallback;
}

function parseTextAlign(value: unknown, fallback: HeroTextAlign): HeroTextAlign {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function parseImageFocus(value: unknown, fallback: HeroImageFocus): HeroImageFocus {
  return value === "left" || value === "center" || value === "right" ? value : fallback;
}

function parseColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
}

function parseLayoutPreset(
  raw: unknown,
  defaults: HeroSlideLayoutPreset,
): HeroSlideLayoutPreset {
  if (!raw || typeof raw !== "object") {
    return { ...defaults };
  }

  const record = raw as Record<string, unknown>;

  return {
    alignX: parseAnchorX(record.alignX, defaults.alignX),
    alignY: parseAnchorY(record.alignY, defaults.alignY),
    offsetX:
      typeof record.offsetX === "number" && Number.isFinite(record.offsetX)
        ? clampNumber(Math.round(record.offsetX), -200, 400)
        : defaults.offsetX,
    offsetY:
      typeof record.offsetY === "number" && Number.isFinite(record.offsetY)
        ? clampNumber(Math.round(record.offsetY), -200, 400)
        : defaults.offsetY,
    maxWidth:
      typeof record.maxWidth === "number" && Number.isFinite(record.maxWidth)
        ? clampNumber(Math.round(record.maxWidth), 200, 900)
        : defaults.maxWidth,
    titleColor: parseColor(record.titleColor, defaults.titleColor),
    descriptionColor: parseColor(record.descriptionColor, defaults.descriptionColor),
    titleSizePx:
      typeof record.titleSizePx === "number" && Number.isFinite(record.titleSizePx)
        ? clampNumber(Math.round(record.titleSizePx), 18, 72)
        : defaults.titleSizePx,
    descriptionSizePx:
      typeof record.descriptionSizePx === "number" && Number.isFinite(record.descriptionSizePx)
        ? clampNumber(Math.round(record.descriptionSizePx), 12, 32)
        : defaults.descriptionSizePx,
    textAlign: parseTextAlign(record.textAlign, defaults.textAlign),
    gradientStrength:
      typeof record.gradientStrength === "number" && Number.isFinite(record.gradientStrength)
        ? clampNumber(Math.round(record.gradientStrength), 0, 100)
        : defaults.gradientStrength,
    imageFocus: parseImageFocus(record.imageFocus, defaults.imageFocus),
  };
}

export function normalizeHeroSlideLayout(raw: unknown): HeroSlideLayout {
  if (!raw || typeof raw !== "object") {
    return {
      desktop: { ...DEFAULT_HERO_DESKTOP_LAYOUT },
      mobile: { ...DEFAULT_HERO_MOBILE_LAYOUT },
    };
  }

  const record = raw as Record<string, unknown>;

  return {
    desktop: parseLayoutPreset(record.desktop, DEFAULT_HERO_DESKTOP_LAYOUT),
    mobile: parseLayoutPreset(record.mobile, DEFAULT_HERO_MOBILE_LAYOUT),
  };
}

export function resolveHeroSlideLayout(layout: HeroSlideLayout | undefined | null): {
  desktop: HeroSlideLayoutPreset;
  mobile: HeroSlideLayoutPreset;
} {
  const normalized = normalizeHeroSlideLayout(layout);
  return {
    desktop: { ...DEFAULT_HERO_DESKTOP_LAYOUT, ...normalized.desktop },
    mobile: { ...DEFAULT_HERO_MOBILE_LAYOUT, ...normalized.mobile },
  };
}
