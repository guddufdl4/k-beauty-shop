import { slugify } from "@/lib/utils";

/** Storefront seed slugs used when mapping Hanmi CLASSIFICATION / Category values. */
export const SEED_CATEGORY_SLUGS = [
  "skincare",
  "makeup",
  "suncare",
  "haircare",
  "bodycare",
  "tools-accessories",
  "mask-pack",
] as const;

export type SeedCategorySlug = (typeof SEED_CATEGORY_SLUGS)[number];

export const CANONICAL_CATEGORY_NAMES: Record<string, string> = {
  skincare: "스킨케어",
  makeup: "메이크업",
  suncare: "선케어",
  haircare: "헤어케어",
  bodycare: "바디케어",
  "tools-accessories": "도구 및 액세서리",
  "mask-pack": "마스크팩",
  nail: "네일",
  set: "세트",
  promotion: "프로모션",
};

/** Normalize category keys for alias lookup (lowercase, no spaces/punctuation). */
export function normalizeCategoryKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_\-/()[\].\r\n]+/g, "");
}

/**
 * Hanmi CLASSIFICATION / Category column values → canonical category slug.
 * Keys must be normalized with {@link normalizeCategoryKey}.
 */
export const HANMI_CATEGORY_ALIASES: Record<string, string> = {
  skincare: "skincare",
  skincar: "skincare",
  skin: "skincare",
  essence: "skincare",
  serum: "skincare",
  toner: "skincare",
  cream: "skincare",
  bbcream: "skincare",
  lotion: "skincare",
  moisturizer: "skincare",
  moisturiser: "skincare",
  cleansing: "skincare",
  cleanser: "skincare",
  cleansingfoam: "skincare",
  facial: "skincare",
  face: "skincare",
  ampoule: "skincare",
  ampule: "skincare",
  oil: "skincare",
  mist: "skincare",
  peel: "skincare",
  scrub: "skincare",
  emulsion: "skincare",
  hydraline: "skincare",
  toneupline: "skincare",
  스킨케어: "skincare",
  기초: "skincare",
  스킨: "skincare",

  makeup: "makeup",
  makeupt: "makeup",
  makeupbase: "makeup",
  foundation: "makeup",
  base: "makeup",
  bb: "makeup",
  cc: "makeup",
  cushion: "makeup",
  concealer: "makeup",
  lip: "makeup",
  lipstick: "makeup",
  lipgloss: "makeup",
  liptint: "makeup",
  liptinte: "makeup",
  liptintglow: "makeup",
  liptintmatte: "makeup",
  eye: "makeup",
  eyeliner: "makeup",
  mascara: "makeup",
  shadow: "makeup",
  eyeshadow: "makeup",
  blush: "makeup",
  cheek: "makeup",
  liquidcheek: "makeup",
  powder: "makeup",
  brow: "makeup",
  primer: "makeup",
  tint: "makeup",
  palette: "makeup",
  pallette: "makeup",
  contour: "makeup",
  highlight: "makeup",
  highlighter: "makeup",
  dualliner: "makeup",
  multistick: "makeup",
  men: "makeup",
  메이크업: "makeup",
  베이스: "makeup",
  립: "makeup",
  아이: "makeup",

  mask: "mask-pack",
  maskpack: "mask-pack",
  sheetmask: "mask-pack",
  sheetgelmask: "mask-pack",
  sleepingmask: "mask-pack",
  pack: "mask-pack",
  마스크: "mask-pack",
  마스크팩: "mask-pack",
  팩: "mask-pack",

  suncare: "suncare",
  sun: "suncare",
  sunscreen: "suncare",
  sunblock: "suncare",
  spf: "suncare",
  uv: "suncare",
  sunstick: "suncare",
  선케어: "suncare",
  자외선: "suncare",
  선크림: "suncare",

  acc: "tools-accessories",
  accessory: "tools-accessories",
  accessories: "tools-accessories",
  tool: "tools-accessories",
  tools: "tools-accessories",
  puff: "tools-accessories",
  sponge: "tools-accessories",
  brush: "tools-accessories",
  액세서리: "tools-accessories",

  hair: "haircare",
  haircare: "haircare",
  shampoo: "haircare",
  conditioner: "haircare",
  헤어: "haircare",

  body: "bodycare",
  bodycare: "bodycare",
  bodywash: "bodycare",
  bodylotion: "bodycare",
  hand: "bodycare",
  handwash: "bodycare",
  handlotion: "bodycare",
  handcream: "bodycare",
  foot: "bodycare",
  diatomitefootmat: "bodycare",
  drysheets: "bodycare",
  바디: "bodycare",

  nail: "nail",
  nails: "nail",
  네일: "nail",

  set: "set",
  kit: "set",
  giftset: "set",
  세트: "set",

  gwp: "promotion",
  promo: "promotion",
  promotion: "promotion",
  sample: "promotion",
  프로모션: "promotion",
};

export type ResolvedHanmiCategory = {
  slug: string;
  name: string;
};

function formatDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return trimmed
      .toLowerCase()
      .split(/[\s_\-/]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return trimmed;
}

/** Map a Hanmi row category string to slug + display name for DB lookup/insert. */
export function resolveHanmiCategory(
  raw: string | null | undefined,
): ResolvedHanmiCategory | null {
  if (!raw?.trim()) {
    return null;
  }

  const trimmed = raw.trim();
  const key = normalizeCategoryKey(trimmed);
  if (!key) {
    return null;
  }

  const mappedSlug = HANMI_CATEGORY_ALIASES[key];
  if (mappedSlug) {
    return {
      slug: mappedSlug,
      name: CANONICAL_CATEGORY_NAMES[mappedSlug] ?? formatDisplayName(trimmed),
    };
  }

  const slug = slugify(trimmed) || slugify(key);
  if (!slug) {
    return null;
  }

  return {
    slug,
    name: formatDisplayName(trimmed),
  };
}
