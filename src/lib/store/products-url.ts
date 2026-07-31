export type ProductListSort = "sale" | "trending" | "latest";

export function parseProductListSort(value: string | undefined): ProductListSort | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "sale" || normalized === "trending" || normalized === "latest") {
    return normalized;
  }
  return undefined;
}

export function isProductOnSale(product: {
  price: number;
  compare_at_price: number | null;
}): boolean {
  return product.compare_at_price != null && product.compare_at_price > product.price;
}

export type ProductPriceFields = {
  price: number;
  wholesale_price: number | null;
  compare_at_price: number | null;
};

export function hasDualPricing(product: ProductPriceFields): boolean {
  return product.wholesale_price != null;
}

export function getCompareAtPrice(product: ProductPriceFields): number | null {
  if (!isProductOnSale(product)) {
    return null;
  }
  return product.compare_at_price;
}

export function getCardDisplayPrice(product: ProductPriceFields): number {
  return product.wholesale_price ?? product.price;
}

export type PriceColumn = {
  amount: number;
  labelKey: "retailPrice" | "wholesalePrice";
};

export function getProductPriceColumns(product: ProductPriceFields): {
  primary: PriceColumn;
  secondary: PriceColumn | null;
  compareAt: number | null;
} {
  const compareAt = getCompareAtPrice(product);

  if (hasDualPricing(product)) {
    return {
      primary: { amount: product.price, labelKey: "retailPrice" },
      secondary: { amount: product.wholesale_price!, labelKey: "wholesalePrice" },
      compareAt,
    };
  }

  return {
    primary: { amount: product.price, labelKey: "wholesalePrice" },
    secondary: null,
    compareAt,
  };
}

export function usesBoxQuantityField(product: ProductPriceFields): boolean {
  return !hasDualPricing(product);
}

export type MoqBadgeKey = "moqBadge" | "unitsPerBoxBadge";

export function getMoqBadgeKey(product: ProductPriceFields): MoqBadgeKey {
  return usesBoxQuantityField(product) ? "unitsPerBoxBadge" : "moqBadge";
}

export function isProductSoldOut(product: {
  sold_out?: boolean;
  stock?: number;
}): boolean {
  if (product.sold_out) {
    return true;
  }
  return typeof product.stock === "number" && product.stock <= 0;
}

export type ProductsPaginationItem = number | "ellipsis";

const PRODUCTS_PAGINATION_WINDOW = 10;

export function getProductsPaginationItems(
  currentPage: number,
  totalPages: number,
  windowSize = PRODUCTS_PAGINATION_WINDOW,
): ProductsPaginationItem[] {
  if (totalPages <= 1) {
    return [];
  }

  const safeWindow = Math.max(1, Math.floor(windowSize));
  if (totalPages <= safeWindow) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = currentPage - Math.floor(safeWindow / 2);
  let end = start + safeWindow - 1;

  if (start < 1) {
    start = 1;
    end = safeWindow;
  }

  if (end > totalPages) {
    end = totalPages;
    start = totalPages - safeWindow + 1;
  }

  const items: ProductsPaginationItem[] = [];

  if (start > 1) {
    items.push(1);
    if (start > 2) {
      items.push("ellipsis");
    }
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      items.push("ellipsis");
    }
    items.push(totalPages);
  }

  return items;
}

export function buildProductsHref(options: {
  category?: string;
  brand?: string;
  q?: string;
  page?: number;
  sort?: ProductListSort;
}): string {
  const params = new URLSearchParams();
  if (options.category) {
    params.set("category", options.category);
  }
  if (options.brand) {
    params.set("brand", options.brand);
  }
  if (options.q) {
    params.set("q", options.q);
  }
  if (options.sort) {
    params.set("sort", options.sort);
  }
  if (options.page && options.page > 1) {
    params.set("page", String(options.page));
  }
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

export type BrandAliasGroup = {
  canonical: string;
  aliases: string[];
};

export const CONFIRMED_BRAND_ALIAS_GROUPS: BrandAliasGroup[] = [
  {
    canonical: "ANUA",
    aliases: ["ANUA", "ANUA_2", "Anua(X)", "ANUA(X)"],
  },
  {
    canonical: "MEDICUBE",
    aliases: [
      "MEDICUBE",
      "Medicube(X)",
      "Medicube(XX)",
      "MEDICUBE(X)",
      "MEDICUBE(XX)",
    ],
  },
  {
    canonical: "REJURAN",
    aliases: [
      "REJURAN",
      "Rejuran",
      "REJURAN(NOT VALID)",
      "Rejuran(from 2026.02)",
    ],
  },
  {
    canonical: "NEOGEN",
    aliases: ["NEOGEN", "NEOGEN DERMALOGY"],
  },
  {
    canonical: "Dr.Jart",
    aliases: ["Dr.Jart", "Dr.Jart(from 25.07)", "Dr Jart"],
  },
  {
    canonical: "ROUND LAB",
    aliases: ["ROUND LAB", "RoundLab", "Round Lab"],
  },
  {
    canonical: "SKINFOOD",
    aliases: ["SKINFOOD", "skinfood", "SKINFOOD 1957"],
  },
];

export function normalizeBrandKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const aliasGroupByRawKey = new Map<string, BrandAliasGroup>();
const aliasGroupByCanonicalKey = new Map<string, BrandAliasGroup>();

for (const group of CONFIRMED_BRAND_ALIAS_GROUPS) {
  aliasGroupByCanonicalKey.set(normalizeBrandKey(group.canonical), group);
  for (const alias of group.aliases) {
    aliasGroupByRawKey.set(normalizeBrandKey(alias), group);
  }
}

export function stripInternalBrandMarkers(raw: string): string {
  return raw
    .replace(/\s*\((?:X+|XX+|NOT\s+VALID)\)\s*/gi, "")
    .replace(/\s*\((?:FROM|from)\s+[^)]+\)\s*/gi, "")
    .replace(/_\d+\s*$/g, "")
    .trim();
}

export function findBrandAliasGroup(rawBrand: string): BrandAliasGroup | null {
  return aliasGroupByRawKey.get(normalizeBrandKey(rawBrand)) ?? null;
}

export function getDisplayBrandName(rawBrand: string): string {
  const group = findBrandAliasGroup(rawBrand);
  if (group) {
    return group.canonical;
  }

  const stripped = stripInternalBrandMarkers(rawBrand);
  return stripped || rawBrand.trim();
}

export function getBrandFilterValue(rawBrand: string): string {
  const group = findBrandAliasGroup(rawBrand);
  if (group) {
    return group.canonical;
  }

  const stripped = stripInternalBrandMarkers(rawBrand);
  return stripped || rawBrand.trim();
}

export function resolveBrandFilterValues(filterBrand: string): string[] {
  const trimmed = filterBrand.trim();
  if (!trimmed) {
    return [];
  }

  const group =
    aliasGroupByCanonicalKey.get(normalizeBrandKey(trimmed)) ??
    aliasGroupByRawKey.get(normalizeBrandKey(trimmed));

  if (group) {
    return [...group.aliases];
  }

  return [trimmed];
}

export function matchesBrandFilter(
  productBrand: string,
  filterBrand: string,
  exact: boolean,
): boolean {
  const filter = filterBrand.trim();
  if (!filter) {
    return true;
  }

  if (exact) {
    const allowed = new Set(
      resolveBrandFilterValues(filter).map((value) => normalizeBrandKey(value)),
    );
    return allowed.has(normalizeBrandKey(productBrand));
  }

  const term = normalizeBrandKey(filter);
  return (
    normalizeBrandKey(productBrand).includes(term) ||
    normalizeBrandKey(getDisplayBrandName(productBrand)).includes(term)
  );
}

export function buildBrandCatalog(rawBrands: string[]): string[] {
  const seen = new Set<string>();
  const catalog: string[] = [];

  for (const raw of rawBrands) {
    const entry = getBrandFilterValue(raw);
    if (!entry) {
      continue;
    }

    const key = normalizeBrandKey(entry);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    catalog.push(entry);
  }

  return catalog.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

/** First A–Z index letter for brand directory filters; non-Latin leading chars map to "#". */
export function getBrandIndexLetter(brand: string): string {
  const trimmed = brand.trim();
  if (!trimmed) {
    return "#";
  }

  const first = trimmed[0].toUpperCase();
  if (/[A-Z]/.test(first)) {
    return first;
  }

  return "#";
}

export const BRAND_INDEX_LETTERS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

export type MainNavLink = {
  key: string;
  href: string;
  highlight?: boolean;
};

export const MAIN_NAV_LINKS: MainNavLink[] = [
  { key: "skincare", href: buildProductsHref({ category: "skincare" }) },
  { key: "makeup", href: buildProductsHref({ category: "makeup" }) },
  { key: "hairBody", href: buildProductsHref({ category: "haircare" }) },
  { key: "brands", href: "/brands" },
  { key: "newArrivals", href: buildProductsHref({ sort: "latest" }) },
  { key: "bestSellers", href: buildProductsHref({ sort: "trending" }) },
  { key: "wholesale", href: "/wholesale-inquiry", highlight: true },
];

export type HomeTrustHighlightKey =
  | "authenticProducts"
  | "flexibleMoq"
  | "globalShipping"
  | "b2bSupport";

export type HomeTrustHighlight = {
  key: HomeTrustHighlightKey;
  enabled: boolean;
};

/** Homepage trust bar — set `enabled: false` to hide an item without DB changes. */
export const HOME_TRUST_HIGHLIGHTS: HomeTrustHighlight[] = [
  { key: "authenticProducts", enabled: true },
  { key: "flexibleMoq", enabled: true },
  { key: "globalShipping", enabled: true },
  { key: "b2bSupport", enabled: true },
];

export type HomeCategorySlug =
  | "skincare"
  | "makeup"
  | "mask-pack"
  | "suncare"
  | "haircare"
  | "bodycare";

export type HomeCategoryItem = {
  slug: HomeCategorySlug;
  enabled: boolean;
};

/** Homepage category row — set `enabled: false` to hide a category without DB changes. */
export const HOME_CATEGORY_SLUGS: HomeCategoryItem[] = [
  { slug: "skincare", enabled: true },
  { slug: "makeup", enabled: true },
  { slug: "mask-pack", enabled: true },
  { slug: "suncare", enabled: true },
  { slug: "haircare", enabled: true },
  { slug: "bodycare", enabled: true },
];

export type HomeFeaturedBrandItem = {
  displayName: string;
  enabled: boolean;
};

/** Homepage featured brands row — order preserved; set `enabled: false` to hide without DB changes. */
export const HOME_FEATURED_BRANDS: HomeFeaturedBrandItem[] = [
  { displayName: "VT", enabled: true },
  { displayName: "SKINFOOD", enabled: true },
  { displayName: "Torriden", enabled: true },
  { displayName: "COSRX", enabled: true },
  { displayName: "ANUA", enabled: true },
  { displayName: "ROUND LAB", enabled: true },
];

export type ResolvedFeaturedBrand = {
  displayName: string;
  filterBrand: string;
};

function buildFeaturedBrandMatchKeys(displayName: string): Set<string> {
  const keys = new Set<string>();
  keys.add(normalizeBrandKey(displayName));

  for (const alias of resolveBrandFilterValues(displayName)) {
    keys.add(normalizeBrandKey(alias));
  }

  return keys;
}

function productMatchesFeaturedBrand(rawBrand: string, matchKeys: Set<string>): boolean {
  const candidates = [
    rawBrand,
    getBrandFilterValue(rawBrand),
    getDisplayBrandName(rawBrand),
  ];

  return candidates.some((candidate) => matchKeys.has(normalizeBrandKey(candidate)));
}

/** Resolve configured featured brands against a product pool (no logo fetch). */
export function resolveFeaturedBrandsFromProducts(
  products: { brand: string | null }[],
): ResolvedFeaturedBrand[] {
  const resolved: ResolvedFeaturedBrand[] = [];

  for (const config of HOME_FEATURED_BRANDS) {
    if (!config.enabled) {
      continue;
    }

    const matchKeys = buildFeaturedBrandMatchKeys(config.displayName);
    const matchedProduct = products.find(
      (product) => product.brand && productMatchesFeaturedBrand(product.brand, matchKeys),
    );

    if (!matchedProduct?.brand) {
      continue;
    }

    resolved.push({
      displayName: config.displayName,
      filterBrand: getBrandFilterValue(matchedProduct.brand),
    });
  }

  return resolved;
}
