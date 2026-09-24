import type { AppLocale } from "@/i18n/routing";
import { SEO_BRAND_NAME } from "@/lib/seo/constants";

export type SeoCopy = {
  title: string;
  description: string;
  h1: string;
  intro?: string;
};

const HOME_SEO: Record<AppLocale, SeoCopy> = {
  en: {
    title: `Korean Cosmetics Wholesale & K-Beauty Supplier | ${SEO_BRAND_NAME}`,
    description:
      "HMT KOREA supplies authentic Korean cosmetics and K-Beauty products to wholesale buyers worldwide. Browse Korean skincare, makeup, masks, sun care and leading K-Beauty brands for B2B orders.",
    h1: "Korean Cosmetics Wholesale & K-Beauty B2B Supplier",
    intro:
      "HMT KOREA is a Korea-based B2B cosmetics supplier providing authentic K-Beauty products to international wholesale buyers. Explore Korean skincare, makeup, masks, sun care, hair care and body care from a wide selection of Korean beauty brands. MOQ varies by product. Buyers can build an order through the catalog and request a quotation from HMT KOREA.",
  },
  ko: {
    title: `한국 화장품 도매 · K-뷰티 B2B 공급 | ${SEO_BRAND_NAME}`,
    description:
      "HMT KOREA는 해외 도매 바이어에게 정품 한국 화장품과 K-뷰티 상품을 공급합니다. 스킨케어, 메이크업, 마스크, 선케어 등 B2B 견적 주문을 확인하세요.",
    h1: "한국 화장품 도매 · K-뷰티 B2B 공급",
    intro:
      "HMT KOREA는 해외 도매 바이어를 위한 한국 기반 B2B 화장품 공급사입니다. 카탈로그에서 브랜드와 카테고리를 살펴본 뒤 견적을 요청할 수 있으며, 제품별 MOQ는 상품에 따라 다릅니다.",
  },
  ja: {
    title: `韓国化粧品卸売・K-ビューティーサプライヤー | ${SEO_BRAND_NAME}`,
    description:
      "HMT KOREAは海外卸売バイヤーへ正規韓国化粧品とK-Beauty商品を供給します。スキンケア、メイク、マスク、日焼け止めなどB2B見積注文に対応します。",
    h1: "韓国化粧品卸売・K-Beauty B2Bサプライヤー",
    intro:
      "HMT KOREAは韓国拠点のB2B化粧品サプライヤーです。カタログからブランドとカテゴリーを選び、見積を依頼できます。MOQは商品により異なります。",
  },
  zh: {
    title: `韩国化妆品批发 · K-Beauty 供应商 | ${SEO_BRAND_NAME}`,
    description:
      "HMT KOREA 向全球批发买家供应正品韩国化妆品与 K-Beauty 产品。浏览护肤、彩妆、面膜、防晒等品类并申请 B2B 报价。",
    h1: "韩国化妆品批发 · K-Beauty B2B 供应商",
    intro:
      "HMT KOREA 是总部位于韩国的 B2B 化妆品供应商。买家可在目录中浏览品牌与分类后申请报价，各产品起订量（MOQ）以商品页面为准。",
  },
};

type CategoryLanding = {
  title: string;
  h1: string;
  description: string;
  body: string;
};

const CATEGORY_LANDING_EN: Record<string, CategoryLanding> = {
  skincare: {
    title: `Korean Skincare Wholesale | K-Beauty Supplier | ${SEO_BRAND_NAME}`,
    h1: "Korean Skincare Wholesale",
    description:
      "Shop Korean skincare wholesale from HMT KOREA. Browse authentic K-Beauty toners, serums, creams and more for international B2B buyers.",
    body: "HMT KOREA supplies Korean skincare wholesale to distributors, retailers and professional buyers who need authentic K-Beauty products from Korea. This category covers everyday and professional-use items such as toners, essences, serums, ampoules, moisturizers and creams from established Korean beauty brands.\n\nWholesale buyers can compare brands in one catalog, review pack sizes where listed, and check each product page for SKU and minimum order quantity. MOQ is set by product, not as a single site-wide rule, so mixed-brand orders can be planned around the items you actually need.\n\nHMT KOREA is a B2B quotation-based supplier rather than a consumer checkout shop. After you shortlist Korean skincare, request a quotation for export packing and international shipping terms. Product details on this page reflect catalog data only; we do not add medical claims or invented ingredients.",
  },
  makeup: {
    title: `Korean Makeup Wholesale | K-Beauty Supplier | ${SEO_BRAND_NAME}`,
    h1: "Korean Makeup Wholesale",
    description:
      "Shop Korean makeup wholesale from HMT KOREA. Browse authentic K-Beauty color cosmetics for international B2B and bulk orders.",
    body: "This makeup category presents Korean color cosmetics available for wholesale through HMT KOREA. Buyers can review lip, eye and complexion products from Korean beauty brands that are listed in the live catalog, then open a product page for SKU, size and MOQ when those fields exist.\n\nInternational retailers and distributors use this listing to plan K-Beauty makeup assortments without relying on consumer retail checkouts. Pricing for signed-in wholesale accounts is shown on product pages; guests can still browse the range and request a quotation.\n\nHMT KOREA sources authentic Korean cosmetics for B2B export. Descriptions stay limited to catalog facts. Shade names, textures and claimed performance are only shown when they are part of the product data, not generated for search engines.",
  },
  "mask-pack": {
    title: `Korean Face Mask Wholesale | K-Beauty Supplier | ${SEO_BRAND_NAME}`,
    h1: "Korean Face Mask Wholesale",
    description:
      "Shop Korean face mask wholesale from HMT KOREA. Browse authentic sheet masks and mask packs for international B2B buyers.",
    body: "Korean face masks and mask packs are a core K-Beauty wholesale category. HMT KOREA lists sheet masks and related mask products from Korean brands so overseas buyers can review options in one place and order by SKU.\n\nMask assortments are often used for retail sets, spa supply and promotional lines. Because MOQ varies by product, buyers should check the product card or detail page before building a mixed carton. Volume or sheet count is shown only when it is stored in the catalog.\n\nThis is a B2B catalog for quotation, not a same-day consumer checkout. Request a quote after selecting the masks you need. We do not invent clinical results or unlisted ingredients for ranking purposes.",
  },
  suncare: {
    title: `Korean Sunscreen Wholesale | K-Beauty Supplier | ${SEO_BRAND_NAME}`,
    h1: "Korean Sunscreen Wholesale",
    description:
      "Shop Korean sunscreen wholesale from HMT KOREA. Browse authentic K-Beauty sun care products for international B2B orders.",
    body: "The sun care category collects Korean sunscreens and related UV-care products available for wholesale from HMT KOREA. Buyers serving retail, salon or export programs can scan brands and pack sizes that appear in the catalog and open each listing for SKU and MOQ.\n\nKorean sun care is frequently requested by overseas K-Beauty distributors. HMT KOREA presents only products that are active in the wholesale catalog. SPF values, textures and usage notes appear only when they are part of the product record.\n\nOrders are quotation-based for international B2B buyers. After you select sun care items, submit a quotation request. Do not treat this page as medical advice; it is a product index for authentic Korean cosmetics wholesale.",
  },
  haircare: {
    title: `Korean Hair Care Wholesale | ${SEO_BRAND_NAME}`,
    h1: "Korean Hair Care Wholesale",
    description:
      "Shop Korean hair care wholesale from HMT KOREA. Browse authentic K-Beauty shampoos, treatments and hair products for B2B buyers.",
    body: "HMT KOREA offers Korean hair care wholesale for buyers who need authentic K-Beauty shampoos, treatments and related hair products. Use this category to browse brands currently listed, then open a product page for SKU, size and minimum order quantity when those details are on file.\n\nHair care assortments for export often mix hero SKUs with supporting items. Because MOQ is product-specific, plan cartons from the catalog rather than assuming a single case pack for every brand.\n\nHMT KOREA supplies B2B buyers by quotation. Descriptions are limited to catalog information and do not add unlisted performance claims.",
  },
  bodycare: {
    title: `Korean Body Care Wholesale | ${SEO_BRAND_NAME}`,
    h1: "Korean Body Care Wholesale",
    description:
      "Shop Korean body care wholesale from HMT KOREA. Browse authentic K-Beauty body lotions and body products for B2B orders.",
    body: "This body care category lists Korean body lotions, washes and related K-Beauty body products available for wholesale from HMT KOREA. International buyers can review the live catalog, compare brands, and check product pages for SKU and MOQ.\n\nBody care is often ordered alongside skincare for full-line K-Beauty programs. Mix products according to each item’s minimum order quantity rather than a generic bulk rule.\n\nHMT KOREA is a Korea-based B2B supplier. Request a quotation for export. Copy on this page stays factual and does not invent certifications or treatment claims.",
  },
};

const CATEGORY_H1_LOCAL: Record<AppLocale, Record<string, string>> = {
  en: {},
  ko: {
    skincare: "한국 스킨케어 도매",
    makeup: "한국 메이크업 도매",
    "mask-pack": "한국 마스크팩 도매",
    suncare: "한국 선케어 도매",
    haircare: "한국 헤어케어 도매",
    bodycare: "한국 바디케어 도매",
  },
  ja: {
    skincare: "韓国スキンケア卸売",
    makeup: "韓国メイク卸売",
    "mask-pack": "韓国フェイスマスク卸売",
    suncare: "韓国日焼け止め卸売",
    haircare: "韓国ヘアケア卸売",
    bodycare: "韓国ボディケア卸売",
  },
  zh: {
    skincare: "韩国护肤批发",
    makeup: "韩国彩妆批发",
    "mask-pack": "韩国面膜批发",
    suncare: "韩国防晒批发",
    haircare: "韩国护发批发",
    bodycare: "韩国身体护理批发",
  },
};

export function getHomeSeo(locale: AppLocale): SeoCopy {
  return HOME_SEO[locale] ?? HOME_SEO.en;
}

export function getCategoriesIndexSeo(locale: AppLocale): SeoCopy {
  if (locale === "ko") {
    return {
      title: `K-뷰티 카테고리 도매 | ${SEO_BRAND_NAME}`,
      description:
        "스킨케어, 메이크업, 마스크, 선케어, 헤어·바디 등 한국 화장품 도매 카테고리를 HMT KOREA에서 확인하세요.",
      h1: "K-뷰티 도매 카테고리",
    };
  }
  if (locale === "ja") {
    return {
      title: `K-Beautyカテゴリー卸売 | ${SEO_BRAND_NAME}`,
      description:
        "スキンケア、メイク、マスク、日焼け止め、ヘア・ボディなど韓国化粧品の卸売カテゴリーをHMT KOREAでご覧ください。",
      h1: "K-Beauty卸売カテゴリー",
    };
  }
  if (locale === "zh") {
    return {
      title: `K-Beauty 分类批发 | ${SEO_BRAND_NAME}`,
      description:
        "在 HMT KOREA 浏览护肤、彩妆、面膜、防晒、头发与身体护理等韩国化妆品批发分类。",
      h1: "K-Beauty 批发分类",
    };
  }
  return {
    title: `Korean Beauty Categories | K-Beauty Wholesale | ${SEO_BRAND_NAME}`,
    description:
      "Browse Korean skincare, makeup, face masks, sun care, hair care and body care categories for B2B wholesale from HMT KOREA.",
    h1: "Korean Beauty Wholesale Categories",
  };
}

export function getBrandsIndexSeo(locale: AppLocale): SeoCopy {
  if (locale === "ko") {
    return {
      title: `K-뷰티 브랜드 도매 | ${SEO_BRAND_NAME}`,
      description: "HMT KOREA에서 한국 화장품 브랜드를 선택하고 도매 카탈로그와 견적을 진행하세요.",
      h1: "K-뷰티 도매 브랜드",
    };
  }
  if (locale === "ja") {
    return {
      title: `K-Beautyブランド卸売 | ${SEO_BRAND_NAME}`,
      description: "HMT KOREAで韓国化粧品ブランドを選び、卸売カタログと見積を進められます。",
      h1: "K-Beauty卸売ブランド",
    };
  }
  if (locale === "zh") {
    return {
      title: `K-Beauty 品牌批发 | ${SEO_BRAND_NAME}`,
      description: "在 HMT KOREA 选择韩国化妆品品牌，浏览批发目录并申请报价。",
      h1: "K-Beauty 批发品牌",
    };
  }
  return {
    title: `K-Beauty Brands Wholesale | Korean Cosmetics Supplier | ${SEO_BRAND_NAME}`,
    description:
      "Browse Korean beauty brands available for wholesale from HMT KOREA. Open a brand catalog and request a B2B quotation.",
    h1: "K-Beauty Wholesale Brands",
  };
}

export function getProductsIndexSeo(locale: AppLocale): SeoCopy {
  if (locale === "ko") {
    return {
      title: `한국 화장품 도매 카탈로그 | ${SEO_BRAND_NAME}`,
      description: "HMT KOREA 도매 카탈로그에서 한국 화장품과 K-뷰티 상품을 검색하고 견적을 요청하세요.",
      h1: "도매 카탈로그",
    };
  }
  if (locale === "ja") {
    return {
      title: `韓国化粧品卸売カタログ | ${SEO_BRAND_NAME}`,
      description: "HMT KOREAの卸売カタログで韓国化粧品とK-Beauty商品を確認し、見積を依頼できます。",
      h1: "卸売カタログ",
    };
  }
  if (locale === "zh") {
    return {
      title: `韩国化妆品批发目录 | ${SEO_BRAND_NAME}`,
      description: "在 HMT KOREA 批发目录中浏览韩国化妆品与 K-Beauty 产品并申请报价。",
      h1: "批发目录",
    };
  }
  return {
    title: `Korean Cosmetics Wholesale Catalog | ${SEO_BRAND_NAME}`,
    description:
      "Browse the HMT KOREA wholesale catalog of authentic Korean cosmetics and K-Beauty products for international B2B buyers.",
    h1: "Korean Cosmetics Wholesale Catalog",
  };
}

export function getCategorySeo(
  slug: string,
  locale: AppLocale,
  fallbackName: string,
): CategoryLanding {
  const landing = CATEGORY_LANDING_EN[slug];
  const localizedH1 = CATEGORY_H1_LOCAL[locale]?.[slug];

  if (landing) {
    if (locale === "en") {
      return landing;
    }
    const name = fallbackName || landing.h1;
    return {
      title: `${localizedH1 ?? name} | ${SEO_BRAND_NAME}`,
      h1: localizedH1 ?? name,
      description:
        locale === "ko"
          ? `HMT KOREA에서 ${name} 도매 상품을 확인하세요. 정품 한국 화장품 B2B 견적 주문을 지원합니다.`
          : locale === "ja"
            ? `HMT KOREAで${name}の卸売商品をご覧ください。正規韓国化粧品のB2B見積に対応します。`
            : `在 HMT KOREA 浏览${name}批发商品，面向国际买家提供正品韩国化妆品 B2B 报价。`,
      body: landing.body,
    };
  }

  const name = fallbackName.trim() || slug;
  return {
    title: `Korean ${name} Wholesale | K-Beauty Supplier | ${SEO_BRAND_NAME}`,
    h1: locale === "en" ? `Korean ${name} Wholesale` : name,
    description: `Shop Korean ${name} wholesale products from HMT KOREA for international B2B buyers.`,
    body: `HMT KOREA lists ${name} products for Korean cosmetics wholesale. Review the catalog, open a product page for SKU and MOQ when available, and request a B2B quotation. Details are limited to catalog data.`,
  };
}

export function getBrandSeo(brand: string, locale: AppLocale): SeoCopy & { intro: string } {
  const name = brand.trim();
  if (locale === "ko") {
    return {
      title: `${name} 도매 | 한국 화장품 공급 | ${SEO_BRAND_NAME}`,
      h1: `${name} 도매`,
      description: `HMT KOREA에서 ${name} 도매 상품을 확인하세요. 해외 B2B 바이어를 위한 정품 K-뷰티 카탈로그입니다.`,
      intro: `${name} 도매 상품을 HMT KOREA 카탈로그에서 살펴보고 견적을 요청할 수 있습니다. 제품별 MOQ는 상품 페이지를 기준으로 합니다.`,
    };
  }
  if (locale === "ja") {
    return {
      title: `${name} 卸売 | 韓国化粧品サプライヤー | ${SEO_BRAND_NAME}`,
      h1: `${name} 卸売`,
      description: `HMT KOREAで${name}の卸売商品をご覧ください。海外B2Bバイヤー向けの正規K-Beautyカタログです。`,
      intro: `${name}の卸売商品をHMT KOREAのカタログから確認し、見積を依頼できます。MOQは商品ページの表示に従います。`,
    };
  }
  if (locale === "zh") {
    return {
      title: `${name} 批发 | 韩国化妆品供应商 | ${SEO_BRAND_NAME}`,
      h1: `${name} 批发`,
      description: `在 HMT KOREA 选购 ${name} 批发商品。面向国际 B2B 买家的正品 K-Beauty 目录。`,
      intro: `可在 HMT KOREA 目录中浏览 ${name} 批发商品并申请报价。起订量以各商品页面为准。`,
    };
  }
  return {
    title: `${name} Wholesale | Korean K-Beauty Supplier | ${SEO_BRAND_NAME}`,
    h1: `${name} Wholesale`,
    description: `Shop ${name} wholesale products from HMT KOREA. Browse authentic ${name} K-Beauty products for international B2B and bulk orders.`,
    intro: `HMT KOREA supplies ${name} for international wholesale buyers. Browse the ${name} catalog, check SKU and MOQ on each product page, and request a quotation. MOQ varies by product.`,
  };
}

export function getProductSeo(input: {
  name: string;
  brand: string;
  categoryName?: string | null;
  volume?: string | null;
  sku?: string | null;
  moq?: number | null;
  origin?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  catalogDescription?: string | null;
}): { title: string; description: string } {
  const brand = input.brand.trim();
  const name = input.name.trim();
  const title = input.metaTitle?.trim() || `${name} Wholesale | ${brand} | ${SEO_BRAND_NAME}`;

  if (input.metaDescription?.trim()) {
    return { title, description: input.metaDescription.trim() };
  }
  if (input.catalogDescription?.trim()) {
    const clipped = clipMetaDescription(input.catalogDescription.trim());
    return { title, description: clipped };
  }

  const parts = [
    `Buy ${name} by ${brand} for wholesale and B2B orders from ${SEO_BRAND_NAME}. Authentic Korean beauty products supplied for international buyers.`,
  ];
  if (input.categoryName?.trim()) {
    parts.push(`${input.categoryName.trim()} catalog item.`);
  }
  if (input.volume?.trim()) {
    parts.push(`Size: ${input.volume.trim()}.`);
  }
  if (input.sku?.trim()) {
    parts.push(`SKU ${input.sku.trim()}.`);
  }
  if (input.moq != null && Number.isFinite(input.moq) && input.moq > 0) {
    parts.push(`MOQ ${input.moq}.`);
  }
  if (input.origin?.trim()) {
    parts.push(`Country of origin: ${input.origin.trim()}.`);
  }

  return { title, description: clipMetaDescription(parts.join(" ")) };
}

export function productImageAlt(brand: string, name: string, imageIndex = 0): string {
  const label = [brand.trim(), name.trim()].filter(Boolean).join(" ");
  if (!label) {
    return "Korean cosmetics product";
  }
  if (imageIndex > 0) {
    return `${label} photo ${imageIndex + 1}`;
  }
  return label;
}

function clipMetaDescription(value: string, max = 320): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= max) {
    return compact;
  }
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}
