/** Top-level categories shown in storefront nav (mega menu + sidebar). */
export const STOREFRONT_NAV_SLUGS = [
  "skincare",
  "makeup",
  "mask-pack",
  "suncare",
  "haircare",
  "bodycare",
] as const;

export type StorefrontNavSlug = (typeof STOREFRONT_NAV_SLUGS)[number];

export type CategoryLabelSet = {
  ko: string;
  en: string;
  ja: string;
  zh: string;
};

export type TaxonomyNode = {
  slug: string;
  labels: CategoryLabelSet;
  sortOrder: number;
  children?: TaxonomyNode[];
};

/** Standard K-beauty subcategory tree keyed by parent slug. */
export const CATEGORY_TAXONOMY: Record<StorefrontNavSlug, TaxonomyNode[]> = {
  skincare: [
    {
      slug: "skin-toner",
      labels: {
        ko: "스킨/토너",
        en: "Skin/Toner",
        ja: "スキン/トナー",
        zh: "爽肤水/化妆水",
      },
      sortOrder: 1,
    },
    {
      slug: "lotion-emulsion",
      labels: {
        ko: "로션/에멀전",
        en: "Lotion/Emulsion",
        ja: "ローション/エマルジョン",
        zh: "乳液",
      },
      sortOrder: 2,
    },
    {
      slug: "essence-serum-ampoule",
      labels: {
        ko: "에센스/세럼/앰플",
        en: "Essence/Serum/Ampoule",
        ja: "エッセンス/セラム/アンプル",
        zh: "精华/安瓶",
      },
      sortOrder: 3,
    },
    {
      slug: "cream",
      labels: {
        ko: "크림",
        en: "Cream",
        ja: "クリーム",
        zh: "面霜",
      },
      sortOrder: 4,
      children: [
        {
          slug: "moisture-cream",
          labels: {
            ko: "수분크림",
            en: "Moisture Cream",
            ja: "水分クリーム",
            zh: "保湿面霜",
          },
          sortOrder: 1,
        },
        {
          slug: "nutrition-cream",
          labels: {
            ko: "영양크림",
            en: "Nutrition Cream",
            ja: "栄養クリーム",
            zh: "营养面霜",
          },
          sortOrder: 2,
        },
      ],
    },
    {
      slug: "basic-set",
      labels: {
        ko: "기초세트",
        en: "Basic Sets",
        ja: "基礎セット",
        zh: "基础套装",
      },
      sortOrder: 5,
    },
    {
      slug: "eye-care",
      labels: {
        ko: "아이케어",
        en: "Eye Care",
        ja: "アイケア",
        zh: "眼部护理",
      },
      sortOrder: 6,
    },
    {
      slug: "cleansing",
      labels: {
        ko: "클렌징",
        en: "Cleansing",
        ja: "クレンジング",
        zh: "洁面/卸妆",
      },
      sortOrder: 7,
    },
    {
      slug: "skincare-suncare",
      labels: {
        ko: "선케어",
        en: "Sun Care",
        ja: "サンケア",
        zh: "防晒护理",
      },
      sortOrder: 8,
    },
  ],
  makeup: [
    {
      slug: "makeup-base",
      labels: {
        ko: "베이스",
        en: "Base",
        ja: "ベース",
        zh: "底妆",
      },
      sortOrder: 1,
    },
    {
      slug: "lip-makeup",
      labels: {
        ko: "립",
        en: "Lip",
        ja: "リップ",
        zh: "唇妆",
      },
      sortOrder: 2,
    },
    {
      slug: "eye-makeup",
      labels: {
        ko: "아이",
        en: "Eye",
        ja: "アイ",
        zh: "眼妆",
      },
      sortOrder: 3,
    },
    {
      slug: "cheek",
      labels: {
        ko: "치크",
        en: "Cheek",
        ja: "チーク",
        zh: "腮红",
      },
      sortOrder: 4,
    },
  ],
  "mask-pack": [
    {
      slug: "sheet-mask",
      labels: {
        ko: "시트마스크",
        en: "Sheet Mask",
        ja: "シートマスク",
        zh: "片状面膜",
      },
      sortOrder: 1,
    },
    {
      slug: "sleeping-mask",
      labels: {
        ko: "슬리핑마스크",
        en: "Sleeping Mask",
        ja: "スリーピングマスク",
        zh: "睡眠面膜",
      },
      sortOrder: 2,
    },
    {
      slug: "wash-off-mask",
      labels: {
        ko: "워시오프팩",
        en: "Wash-off Pack",
        ja: "洗い流しパック",
        zh: "水洗面膜",
      },
      sortOrder: 3,
    },
  ],
  suncare: [
    {
      slug: "sunscreen",
      labels: {
        ko: "선크림",
        en: "Sunscreen",
        ja: "日焼け止め",
        zh: "防晒霜",
      },
      sortOrder: 1,
    },
    {
      slug: "sun-stick",
      labels: {
        ko: "선스틱",
        en: "Sun Stick",
        ja: "サンスティック",
        zh: "防晒棒",
      },
      sortOrder: 2,
    },
    {
      slug: "after-sun",
      labels: {
        ko: "애프터선",
        en: "After Sun",
        ja: "アフターサン",
        zh: "晒后修复",
      },
      sortOrder: 3,
    },
  ],
  haircare: [
    {
      slug: "shampoo",
      labels: {
        ko: "샴푸",
        en: "Shampoo",
        ja: "シャンプー",
        zh: "洗发水",
      },
      sortOrder: 1,
    },
    {
      slug: "treatment",
      labels: {
        ko: "트리트먼트",
        en: "Treatment",
        ja: "トリートメント",
        zh: "护发",
      },
      sortOrder: 2,
    },
    {
      slug: "hair-styling",
      labels: {
        ko: "스타일링",
        en: "Styling",
        ja: "スタイリング",
        zh: "造型",
      },
      sortOrder: 3,
    },
  ],
  bodycare: [
    {
      slug: "body-wash",
      labels: {
        ko: "바디워시",
        en: "Body Wash",
        ja: "ボディウォッシュ",
        zh: "沐浴露",
      },
      sortOrder: 1,
    },
    {
      slug: "body-lotion",
      labels: {
        ko: "바디로션",
        en: "Body Lotion",
        ja: "ボディローション",
        zh: "身体乳",
      },
      sortOrder: 2,
    },
    {
      slug: "hand-foot-care",
      labels: {
        ko: "핸드&풋",
        en: "Hand & Foot",
        ja: "ハンド&フット",
        zh: "手足护理",
      },
      sortOrder: 3,
    },
  ],
};

/** Existing flat category slugs → parent slug for re-parenting during seed. */
export const RE_PARENT_SLUG_MAP: Record<string, StorefrontNavSlug> = {
  "face-serum": "skincare",
  "face-cream": "skincare",
  "toner-pad": "skincare",
  "eye-cream": "skincare",
  "eye-patch": "skincare",
  "cleansing-foam": "skincare",
  "soothing-gel": "skincare",
  "acne-patch": "skincare",
  "tone-up-line": "skincare",
  "hydra-line": "skincare",
  "miracle-white-line": "skincare",
  "vegan-collagen-line": "skincare",
  "pine-line": "skincare",
  "calm-ampule-line": "skincare",
  "dermatic-clear-line": "skincare",
  "rice-series": "skincare",
  "make-up-base": "makeup",
  "bb-cream": "makeup",
  "multi-stick": "makeup",
  "liquid-cheek": "makeup",
  "dual-liner": "makeup",
  "lip-tint-glow": "makeup",
  "lip-tint-matte": "makeup",
  "lip-care": "makeup",
  "lip-essence": "makeup",
  men: "makeup",
  "hydrogel-mask": "mask-pack",
  "lifting-mask": "mask-pack",
  "bubble-mask": "mask-pack",
  "sheetgel-mask": "mask-pack",
  "sun-cream": "suncare",
  "hand-cream": "bodycare",
  "hand-lotion": "bodycare",
  "hand-wash": "bodycare",
  soap: "bodycare",
  "show-ball": "bodycare",
  "bath-body": "bodycare",
  perfume: "bodycare",
  "beauty-device": "bodycare",
  "oil-control-paper": "bodycare",
};

export function isStorefrontNavSlug(slug: string): slug is StorefrontNavSlug {
  return (STOREFRONT_NAV_SLUGS as readonly string[]).includes(slug);
}

export function flattenTaxonomyLabels(): Record<string, CategoryLabelSet> {
  const labels: Record<string, CategoryLabelSet> = {};

  for (const nodes of Object.values(CATEGORY_TAXONOMY)) {
    for (const node of nodes) {
      labels[node.slug] = node.labels;
      for (const child of node.children ?? []) {
        labels[child.slug] = child.labels;
      }
    }
  }

  return labels;
}
