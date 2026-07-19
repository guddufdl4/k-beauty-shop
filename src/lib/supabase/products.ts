import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatKRW } from "@/lib/utils";
import {
  enrichProductImages,
  productHasRealImage,
} from "@/lib/product-images";
import type { ProductListSort } from "@/lib/store/products-url";
import { isProductOnSale } from "@/lib/store/products-url";
import { isSupabaseConfigured } from "./config";
import { createSafeClient } from "./safe-server";
import { createPublicClient, createServiceClient } from "./service";
import {
  ensureSoftDeleteColumnProbed,
  isMissingDeletedAtColumnError,
  isSoftDeleteColumnAvailable,
  markSoftDeleteColumnMissing,
} from "./soft-delete";

export const formatUsd = formatKRW;

const SUPABASE_PAGE_SIZE = 1000;
export const STOREFRONT_PRODUCTS_PAGE_SIZE = 48;
const CACHE_REVALIDATE_SECONDS = 300;

export type ProductStatus = "draft" | "active" | "archived";
export type ProductContentStatus = "pending" | "complete";
export type ProductDeletionFilter = "active" | "deleted" | "all";

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  brand: string;
  sku: string;
  barcode: string | null;
  price: number;
  wholesale_price: number | null;
  compare_at_price: number | null;
  moq: number;
  stock: number;
  sold_out: boolean;
  weight_grams: number | null;
  ingredients: string | null;
  how_to_use: string | null;
  country_of_origin: string | null;
  status: ProductStatus;
  import_batch_id: string | null;
  external_sku: string | null;
  source_row: Record<string, unknown> | null;
  image_url: string | null;
  content_status: ProductContentStatus;
  needs_image: boolean;
  needs_description: boolean;
  is_featured: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImportBatchSummary = Pick<ProductImportBatch, "id" | "filename">;

export type ProductWithRelations = Product & {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  import_batch: ProductImportBatchSummary | null;
  images: ProductImage[];
};

export type ProductImportBatch = {
  id: string;
  filename: string;
  row_count: number;
  imported_count: number;
  failed_count: number;
  /** Products currently linked via products.import_batch_id */
  product_count: number;
  status: "processing" | "success" | "partial" | "failed";
  imported_at: string | null;
  created_at: string;
};

export type DataSource = "database" | "static";

export type FetchMeta = {
  source: DataSource;
  configured: boolean;
  error?: string;
};

const STATIC_CATEGORIES: Category[] = [
  {
    id: "static-skincare",
    parent_id: null,
    name: "스킨케어",
    slug: "skincare",
    description: "에센스, 세럼, 토너 등 기초 스킨케어",
    image_url: null,
    sort_order: 1,
    is_active: true,
  },
  {
    id: "static-makeup",
    parent_id: null,
    name: "메이크업",
    slug: "makeup",
    description: "립, 아이, 베이스 메이크업",
    image_url: null,
    sort_order: 2,
    is_active: true,
  },
  {
    id: "static-mask",
    parent_id: null,
    name: "마스크팩",
    slug: "mask-pack",
    description: "시트 마스크 & 슬리핑 마스크",
    image_url: null,
    sort_order: 3,
    is_active: true,
  },
  {
    id: "static-suncare",
    parent_id: null,
    name: "선케어",
    slug: "suncare",
    description: "자외선 차단 & 애프터선 케어",
    image_url: null,
    sort_order: 4,
    is_active: true,
  },
];

function staticProduct(
  partial: Partial<Omit<ProductWithRelations, "images">> & {
    id: string;
    name: string;
    slug: string;
    brand: string;
    sku: string;
    price: number;
    moq: number;
    stock: number;
    status: ProductStatus;
    is_featured: boolean;
    created_at: string;
    updated_at: string;
    category: Pick<Category, "id" | "name" | "slug"> | null;
    import_batch?: ProductImportBatchSummary | null;
  },
): ProductWithRelations {
  return {
    ...partial,
    category_id: partial.category_id ?? null,
    description: partial.description ?? null,
    short_description: partial.short_description ?? null,
    barcode: partial.barcode ?? null,
    wholesale_price: partial.wholesale_price ?? null,
    compare_at_price: partial.compare_at_price ?? null,
    weight_grams: partial.weight_grams ?? null,
    ingredients: partial.ingredients ?? null,
    how_to_use: partial.how_to_use ?? null,
    country_of_origin: partial.country_of_origin ?? null,
    sold_out: partial.sold_out ?? false,
    import_batch_id: partial.import_batch_id ?? null,
    external_sku: partial.external_sku ?? null,
    source_row: partial.source_row ?? null,
    image_url: partial.image_url ?? null,
    content_status: partial.content_status ?? "complete",
    needs_image: partial.needs_image ?? false,
    needs_description: partial.needs_description ?? false,
    deleted_at: partial.deleted_at ?? null,
    import_batch: partial.import_batch ?? null,
    images: [],
  };
}

export const STATIC_PRODUCTS: ProductWithRelations[] = [
  staticProduct({
    id: "static-hydra-serum",
    category_id: "static-skincare",
    name: "하이드라 수분 세럼",
    slug: "hydra-serum",
    description: "건조한 피부를 위한 수분 세럼. 해외 수출 인기 상품.",
    short_description: "수분 충전 세럼 50ml",
    brand: "Seoul Glow",
    sku: "SG-HS-50",
    barcode: null,
    price: 28000,
    wholesale_price: 18000,
    compare_at_price: null,
    moq: 12,
    stock: 200,
    weight_grams: 80,
    ingredients: "Hyaluronic Acid, Glycerin, Panthenol",
    how_to_use: "토너 후 2~3방울을 얼굴에 펴 발라 흡수시킵니다.",
    country_of_origin: "KR",
    status: "active",
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "static-skincare", name: "스킨케어", slug: "skincare" },
  }),
  staticProduct({
    id: "static-1",
    category_id: "static-skincare",
    name: "로즈 하이드레이팅 에센스",
    slug: "lumiere-rose-hydrating-essence",
    description:
      "불가리안 로즈 워터와 히알루론산이 피부에 수분을 채워주는 가벼운 에센스입니다. 수출용 대용량 150ml.",
    short_description: "수분 충전 로즈 에센스",
    brand: "Lumière Seoul",
    sku: "LS-RE-150",
    barcode: null,
    price: 28000,
    wholesale_price: 16800,
    compare_at_price: 32000,
    moq: 12,
    stock: 240,
    weight_grams: 180,
    ingredients: "Rosa Damascena Flower Water, Hyaluronic Acid, Glycerin",
    how_to_use: "토너 후 2~3방울을 얼굴 전체에 두드려 흡수시킵니다.",
    country_of_origin: "KR",
    status: "active",
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "static-skincare", name: "스킨케어", slug: "skincare" },
  }),
  staticProduct({
    id: "static-2",
    category_id: "static-makeup",
    name: "벨벳 립 틴트 3종 세트",
    slug: "han-river-velvet-lip-tint-set",
    description:
      "맑게 발색되는 벨벳 립 틴트 3색 세트. B2B MOQ 24세트, 수출 포장 포함.",
    short_description: "수출용 립 틴트 베스트셀러",
    brand: "Han River Beauty",
    sku: "HRB-LT-SET",
    barcode: null,
    price: 45000,
    wholesale_price: 27000,
    compare_at_price: null,
    moq: 24,
    stock: 120,
    weight_grams: 95,
    ingredients: null,
    how_to_use: null,
    country_of_origin: "KR",
    status: "active",
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "static-makeup", name: "메이크업", slug: "makeup" },
  }),
  staticProduct({
    id: "static-3",
    category_id: "static-mask",
    name: "제주 그린티 슬리핑 마스크",
    slug: "jeju-dew-green-tea-sleep-mask",
    description:
      "제주 유기농 녹차 추출물이 함유된 오버나이트 수분 마스크. 80ml 튜브형.",
    short_description: "밤새 촉촉한 슬리핑 마스크",
    brand: "Jeju Dew Co.",
    sku: "JDC-GT-80",
    barcode: null,
    price: 22000,
    wholesale_price: 13200,
    compare_at_price: 26000,
    moq: 20,
    stock: 180,
    weight_grams: 95,
    ingredients: "Camellia Sinensis Leaf Extract, Panthenol, Squalane",
    how_to_use: "스킨케어 마지막 단계에 적당량을 펴 바릅니다.",
    country_of_origin: "KR",
    status: "active",
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "static-mask", name: "마스크팩", slug: "mask-pack" },
  }),
  staticProduct({
    id: "static-4",
    category_id: "static-suncare",
    name: "SPF50+ 에어리 선 플루이드",
    slug: "seoul-glow-airy-sun-fluid",
    description:
      "끈적임 없는 워터리 텍스처의 고함량 선크림. 해외 유통용 50ml.",
    short_description: "가벼운 데일리 선케어",
    brand: "Seoul Glow Lab",
    sku: "SGL-SF-50",
    barcode: null,
    price: 26000,
    wholesale_price: 15600,
    compare_at_price: null,
    moq: 30,
    stock: 300,
    weight_grams: 65,
    ingredients: "Zinc Oxide, Tocopherol, Centella Asiatica Extract",
    how_to_use: "외출 30분 전 적당량을 고르게 펴 바릅니다.",
    country_of_origin: "KR",
    status: "active",
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "static-suncare", name: "선케어", slug: "suncare" },
  }),
  staticProduct({
    id: "static-5",
    category_id: "static-skincare",
    name: "스네일 리페어 앰플",
    slug: "peach-blossom-snail-ampoule",
    description:
      "92% 스네일 mucin 함유 집중 앰플. 민감 피부용, 무향료 포뮬러.",
    short_description: "재생 케어 집중 앰플",
    brand: "Peach Blossom K",
    sku: "PBK-SA-50",
    barcode: null,
    price: 35000,
    wholesale_price: 21000,
    compare_at_price: 39000,
    moq: 15,
    stock: 90,
    weight_grams: 75,
    ingredients: "Snail Secretion Filtrate, Niacinamide, Allantoin",
    how_to_use: "세럼 단계에서 1~2펌프를 사용합니다.",
    country_of_origin: "KR",
    status: "active",
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: "static-skincare", name: "스킨케어", slug: "skincare" },
  }),
];

export const FALLBACK_PRODUCTS = STATIC_PRODUCTS;

const PRIORITY_KEYS_PATH = resolve("data/brand-priority-skus.json");

const DEMO_PRODUCT_SLUGS = new Set([
  "hydra-serum",
  "lumiere-rose-hydrating-essence",
  "han-river-velvet-lip-tint-set",
  "jeju-dew-green-tea-sleep-mask",
  "seoul-glow-airy-sun-fluid",
  "peach-blossom-snail-ampoule",
]);

const DEMO_PRODUCT_SKUS = new Set([
  "SG-HS-50",
  "LS-RE-150",
  "HRB-LT-SET",
  "JDC-GT-80",
  "SGL-SF-50",
  "PBK-SA-50",
]);

let cachedPriorityKeys: Set<string> | null = null;

function getBrandPriorityKeySet(): Set<string> {
  if (cachedPriorityKeys) {
    return cachedPriorityKeys;
  }

  if (!existsSync(PRIORITY_KEYS_PATH)) {
    cachedPriorityKeys = new Set();
    return cachedPriorityKeys;
  }

  const keys = JSON.parse(readFileSync(PRIORITY_KEYS_PATH, "utf8")) as string[];
  cachedPriorityKeys = new Set(keys);
  return cachedPriorityKeys;
}

export function getBrandPrioritySkuTargetCount(): number {
  return getBrandPriorityKeySet().size;
}

function barcodeVariants(value: string): string[] {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return [value.trim()];
  }

  const variants = new Set<string>([value.trim(), digits]);
  const stripped = digits.replace(/^0+/, "");
  if (stripped) {
    variants.add(stripped);
  }
  if (digits.length === 12) {
    variants.add(`0${digits}`);
  }
  if (digits.length === 13 && digits.startsWith("0")) {
    variants.add(digits.slice(1));
  }

  return [...variants];
}

function isDemoProduct(product: { slug: string; sku: string }): boolean {
  return DEMO_PRODUCT_SLUGS.has(product.slug) || DEMO_PRODUCT_SKUS.has(product.sku);
}

function productMatchesBrandPriority(product: {
  sku: string;
  barcode: string | null;
}): boolean {
  const priorityKeys = getBrandPriorityKeySet();
  if (priorityKeys.size === 0) {
    return false;
  }

  const candidates = [
    ...barcodeVariants(product.sku),
    ...(product.barcode ? barcodeVariants(product.barcode) : []),
  ];

  return candidates.some((candidate) => priorityKeys.has(candidate));
}

function getBrandPriorityListTargetCount(): number {
  const manifestPath = resolve("data/priority-batches/manifest.json");
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        total_rows?: number;
      };
      if (typeof manifest.total_rows === "number" && manifest.total_rows > 0) {
        return manifest.total_rows;
      }
    } catch {
      // fall through to key-set size
    }
  }

  return getBrandPriorityKeySet().size;
}

export { getBrandPriorityListTargetCount };

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) {
      return { data: all, error: error.message };
    }

    const page = data ?? [];
    if (page.length === 0) {
      break;
    }

    all.push(...page);
    if (page.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return { data: all, error: null };
}

export async function fetchExactCount(
  supabase: SupabaseClient,
  table: string,
  applyFilters?: (query: any) => any,
): Promise<{ count: number; error: string | null }> {
  let query: any = supabase.from(table).select("*", { count: "exact", head: true });
  if (applyFilters) {
    query = applyFilters(query);
  }

  const { count, error } = await query;
  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: count ?? 0, error: null };
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

export function applyDeletedAtFilter<T>(
  query: T,
  filter: ProductDeletionFilter = "active",
): T {
  if (filter === "all" || !isSoftDeleteColumnAvailable()) {
    return query;
  }

  const filtered = query as {
    is: (column: string, value: null) => T;
    not: (column: string, operator: string, value: null) => T;
  };

  if (filter === "active") {
    return filtered.is("deleted_at", null);
  }

  return filtered.not("deleted_at", "is", null);
}

function parseDecimal(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return 0;
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    category_id: row.category_id ? String(row.category_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : null,
    short_description: row.short_description
      ? String(row.short_description)
      : null,
    brand: String(row.brand),
    sku: String(row.sku),
    barcode: row.barcode ? String(row.barcode) : null,
    price: parseDecimal(row.price),
    wholesale_price:
      row.wholesale_price != null ? parseDecimal(row.wholesale_price) : null,
    compare_at_price:
      row.compare_at_price != null ? parseDecimal(row.compare_at_price) : null,
    moq: Number(row.moq ?? 1),
    stock: Number(row.stock ?? 0),
    sold_out: Boolean(row.sold_out),
    weight_grams: row.weight_grams != null ? Number(row.weight_grams) : null,
    ingredients: row.ingredients ? String(row.ingredients) : null,
    how_to_use: row.how_to_use ? String(row.how_to_use) : null,
    country_of_origin: row.country_of_origin
      ? String(row.country_of_origin)
      : null,
    status: (row.status as ProductStatus) ?? "draft",
    import_batch_id: row.import_batch_id ? String(row.import_batch_id) : null,
    external_sku: row.external_sku ? String(row.external_sku) : null,
    source_row:
      row.source_row && typeof row.source_row === "object"
        ? (row.source_row as Record<string, unknown>)
        : null,
    image_url: row.image_url ? String(row.image_url) : null,
    content_status:
      (row.content_status as ProductContentStatus | undefined) ?? "pending",
    needs_image: Boolean(row.needs_image),
    needs_description: Boolean(row.needs_description),
    is_featured: Boolean(row.is_featured),
    deleted_at: row.deleted_at ? String(row.deleted_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    parent_id: row.parent_id ? String(row.parent_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    description: row.description ? String(row.description) : null,
    image_url: row.image_url ? String(row.image_url) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_active: Boolean(row.is_active),
  };
}

function mapImage(row: Record<string, unknown>): ProductImage {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    url: String(row.url),
    alt_text: row.alt_text ? String(row.alt_text) : null,
    sort_order: Number(row.sort_order ?? 0),
    is_primary: Boolean(row.is_primary),
  };
}

function mapImportBatch(
  row: Record<string, unknown>,
  productCount = 0,
): ProductImportBatch {
  const status = String(row.status ?? "processing");
  return {
    id: String(row.id),
    filename: String(row.filename),
    row_count: Number(row.row_count ?? 0),
    imported_count: Number(row.imported_count ?? 0),
    failed_count: Number(row.failed_count ?? 0),
    product_count: productCount,
    status:
      status === "success" ||
      status === "partial" ||
      status === "failed" ||
      status === "processing"
        ? status
        : "processing",
    imported_at: row.imported_at ? String(row.imported_at) : null,
    created_at: String(row.created_at),
  };
}

function mapImportBatchSummary(
  row: Record<string, unknown> | null,
): ProductImportBatchSummary | null {
  if (!row?.id) {
    return null;
  }

  return {
    id: String(row.id),
    filename: String(row.filename),
  };
}

function mapProductWithRelations(row: Record<string, unknown>): ProductWithRelations {
  const categoryRaw = row.category as Record<string, unknown> | null;
  const importBatchRaw = row.import_batch as Record<string, unknown> | null;
  const imagesRaw = (row.images as Record<string, unknown>[] | null) ?? [];

  return enrichProductImages({
    ...mapProduct(row),
    category: categoryRaw
      ? {
          id: String(categoryRaw.id),
          name: String(categoryRaw.name),
          slug: String(categoryRaw.slug),
        }
      : null,
    import_batch: mapImportBatchSummary(importBatchRaw),
    images: imagesRaw
      .map((img) => mapImage(img))
      .sort((a, b) => a.sort_order - b.sort_order),
  });
}

function matchesProductSearch(
  product: Pick<ProductWithRelations, "name" | "sku" | "brand" | "barcode">,
  search: string,
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) {
    return true;
  }

  return [product.name, product.sku, product.brand, product.barcode ?? ""].some(
    (value) => value.toLowerCase().includes(term),
  );
}

function filterStaticProducts(
  products: ProductWithRelations[],
  options?: {
    categorySlug?: string;
    search?: string;
    brand?: string;
    brandExact?: boolean;
    importBatchId?: string;
    sort?: ProductListSort;
  },
): ProductWithRelations[] {
  let filtered = products;

  if (options?.categorySlug) {
    filtered = filtered.filter((p) => p.category?.slug === options.categorySlug);
  }

  if (options?.search?.trim()) {
    filtered = filtered.filter((product) =>
      matchesProductSearch(product, options.search!),
    );
  }

  if (options?.brand?.trim()) {
    const brandTerm = options.brand.trim().toLowerCase();
    filtered = filtered.filter((product) =>
      options.brandExact
        ? product.brand.toLowerCase() === brandTerm
        : product.brand.toLowerCase().includes(brandTerm),
    );
  }

  if (options?.importBatchId) {
    filtered = filtered.filter(
      (product) => product.import_batch_id === options.importBatchId,
    );
  }

  if (options?.sort === "sale") {
    filtered = filtered.filter((product) => isProductOnSale(product));
  } else if (options?.sort === "trending") {
    filtered = filtered.filter((product) => product.is_featured);
  }

  return filtered;
}

type ProductListOrderOptions = {
  orderBy: "created_at" | "updated_at";
  sort?: ProductListSort;
  imageFirst?: boolean;
};

function compareProductsForList(
  a: ProductWithRelations,
  b: ProductWithRelations,
  options: ProductListOrderOptions,
): number {
  if (options.imageFirst === true) {
    const aHasImage = productHasRealImage(a) ? 1 : 0;
    const bHasImage = productHasRealImage(b) ? 1 : 0;
    if (bHasImage !== aHasImage) {
      return bHasImage - aHasImage;
    }
  }

  if (options.sort === "sale") {
    const aCompare = a.compare_at_price ?? 0;
    const bCompare = b.compare_at_price ?? 0;
    if (bCompare !== aCompare) {
      return bCompare - aCompare;
    }
  }

  return b[options.orderBy].localeCompare(a[options.orderBy]);
}

function sortProductsForList(
  products: ProductWithRelations[],
  options: ProductListOrderOptions,
): ProductWithRelations[] {
  return [...products].sort((a, b) => compareProductsForList(a, b, options));
}

function sortStaticProducts(
  products: ProductWithRelations[],
  options: ProductListOrderOptions,
): ProductWithRelations[] {
  return sortProductsForList(products, options);
}

const PRODUCT_SELECT = `
  *,
  category:categories(id, name, slug),
  images:product_images(id, product_id, url, alt_text, sort_order, is_primary)
`;

/** Lightweight select for admin product list table (skips heavy text/json columns). */
const ADMIN_LIST_SELECT =
  "id, category_id, name, slug, brand, sku, barcode, price, wholesale_price, moq, stock, sold_out, status, image_url, import_batch_id, source_row, needs_image, created_at, updated_at, category:categories(id, name, slug), import_batch:product_import_batches(id, filename), images:product_images(id, product_id, url, alt_text, sort_order, is_primary)";

export async function getCategories(): Promise<{
  categories: Category[];
  meta: FetchMeta;
}> {
  return unstable_cache(
    fetchCategoriesFromSource,
    ["storefront-categories"],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  )();
}

async function fetchCategoriesFromSource(): Promise<{
  categories: Category[];
  meta: FetchMeta;
}> {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return {
      categories: STATIC_CATEGORIES,
      meta: { source: "static", configured: false },
    };
  }

  const supabase = createPublicClient();
  if (!supabase) {
    return {
      categories: STATIC_CATEGORIES,
      meta: { source: "static", configured: false },
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return {
      categories: STATIC_CATEGORIES,
      meta: { source: "static", configured: true, error: error.message },
    };
  }

  if (!data?.length) {
    return {
      categories: STATIC_CATEGORIES,
      meta: { source: "static", configured: true },
    };
  }

  return {
    categories: data.map((row) => mapCategory(row as Record<string, unknown>)),
    meta: { source: "database", configured: true },
  };
}

export async function getProducts(
  categoryOrOptions?:
    | string
    | {
        categorySlug?: string;
        includeDraft?: boolean;
        importBatchId?: string;
        search?: string;
        brand?: string;
        brandExact?: boolean;
        sort?: ProductListSort;
        limit?: number;
        page?: number;
        orderBy?: "created_at" | "updated_at";
        deletionFilter?: ProductDeletionFilter;
        imageFirst?: boolean;
        lightSelect?: boolean;
        /** Match products whose SKU/barcode is in brand-priority-skus.json. */
        priorityBrandList?: boolean;
        /** Use service role for admin list (RLS-safe joins + filters). */
        privileged?: boolean;
      },
): Promise<{ products: ProductWithRelations[]; totalCount: number; meta: FetchMeta }> {
  const options =
    typeof categoryOrOptions === "string"
      ? { categorySlug: categoryOrOptions }
      : categoryOrOptions;
  const configured = isSupabaseConfigured();
  const categorySlug = options?.categorySlug?.trim();
  const importBatchId = options?.importBatchId?.trim();
  const searchTerm = options?.search?.trim();
  const brandFilter = options?.brand?.trim();
  const brandExact = Boolean(options?.brandExact);
  const sort = options?.sort;
  const orderBy = options?.orderBy ?? "created_at";
  const deletionFilter = options?.deletionFilter ?? "active";
  const imageFirst = options?.imageFirst === true;
  const lightSelect = options?.lightSelect === true;
  const listLimit = options?.limit;
  const listPage = Math.max(1, options?.page ?? 1);
  const listOrderOptions: ProductListOrderOptions = {
    orderBy,
    sort,
    imageFirst,
  };

  if (options?.priorityBrandList) {
    return fetchPriorityBrandListProducts({
      categorySlug,
      includeDraft: options.includeDraft,
      importBatchId,
      search: searchTerm,
      brand: brandFilter,
      brandExact,
      sort,
      limit: listLimit,
      page: listPage,
      orderBy,
      deletionFilter,
      imageFirst,
      lightSelect,
      privileged: options.privileged,
      listOrderOptions,
      configured,
    });
  }

  function paginateStaticProducts(products: ProductWithRelations[]) {
    if (listLimit == null) {
      return { products, totalCount: products.length };
    }

    const from = (listPage - 1) * listLimit;
    return {
      products: products.slice(from, from + listLimit),
      totalCount: products.length,
    };
  }

  function staticProductsResult() {
    let filtered = filterStaticProducts(STATIC_PRODUCTS, {
      categorySlug,
      search: searchTerm,
      brand: brandFilter,
      brandExact,
      importBatchId,
      sort,
    });

    if (deletionFilter === "deleted") {
      filtered = [];
    }

    const sorted = sortStaticProducts(filtered, listOrderOptions);
    const { products, totalCount } = paginateStaticProducts(sorted);

    return {
      products,
      totalCount,
      meta: { source: "static" as const, configured },
    };
  }

  if (!configured) {
    return staticProductsResult();
  }

  const privileged = options?.privileged === true;
  const supabase = privileged
    ? createServiceClient() ?? (await createSafeClient())
    : await createSafeClient();
  if (!supabase) {
    return staticProductsResult();
  }

  await ensureSoftDeleteColumnProbed(supabase);

  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();

    if (!cat?.id) {
      return {
        products: [],
        totalCount: 0,
        meta: { source: "database", configured: true },
      };
    }

    categoryId = String(cat.id);
  }

  const applyProductFilters = <T,>(query: T, withOrder: boolean): T => {
    let filtered = query as {
      eq: (column: string, value: string | boolean) => typeof filtered;
      or: (filter: string) => typeof filtered;
      order: (column: string, options: { ascending: boolean }) => typeof filtered;
    };

    filtered = applyDeletedAtFilter(filtered, deletionFilter) as typeof filtered;

    if (!options?.includeDraft) {
      filtered = filtered.eq("status", "active");
    }

    if (categoryId) {
      filtered = filtered.eq("category_id", categoryId);
    }

    if (importBatchId) {
      filtered = filtered.eq("import_batch_id", importBatchId);
    }

    if (searchTerm) {
      const escaped = escapeIlikePattern(searchTerm);
      filtered = filtered.or(
        `name.ilike.%${escaped}%,sku.ilike.%${escaped}%,brand.ilike.%${escaped}%`,
      );
    }

    if (brandFilter) {
      if (brandExact) {
        filtered = filtered.eq("brand", brandFilter);
      } else {
        const escaped = escapeIlikePattern(brandFilter);
        filtered = filtered.or(`brand.ilike.%${escaped}%`);
      }
    }

    if (sort === "trending") {
      filtered = filtered.eq("is_featured", true);
    }

    if (withOrder) {
      if (imageFirst) {
        filtered = filtered.order("needs_image", { ascending: true });
      }

      if (sort === "sale") {
        filtered = filtered.order("compare_at_price", { ascending: false });
      } else {
        filtered = filtered.order(orderBy, { ascending: false });
      }
    }

    return filtered as T;
  };

  let totalCount = 0;

  if (listLimit != null) {
    const { count, error: countError } = await fetchExactCount(
      supabase,
      "products",
      (query) => applyProductFilters(query, false),
    );

    if (countError) {
      if (isMissingDeletedAtColumnError(countError)) {
        markSoftDeleteColumnMissing();
        return getProducts(categoryOrOptions);
      }

      return {
        ...staticProductsResult(),
        meta: { source: "static", configured: true, error: countError },
      };
    }

    totalCount = count;

    let query = lightSelect
      ? supabase.from("products").select(ADMIN_LIST_SELECT)
      : supabase.from("products").select(PRODUCT_SELECT);
    query = applyProductFilters(query, true) as typeof query;

    const from = (listPage - 1) * listLimit;
    const { data, error } = await query.range(from, from + listLimit - 1);

    if (error) {
      if (isMissingDeletedAtColumnError(error.message)) {
        markSoftDeleteColumnMissing();
        return getProducts(categoryOrOptions);
      }

      return {
        ...staticProductsResult(),
        meta: { source: "static", configured: true, error: error.message },
      };
    }

    let products = (data ?? []).map((row) =>
      mapProductWithRelations(row as unknown as Record<string, unknown>),
    );

    if (sort === "sale") {
      products = products.filter((product) => isProductOnSale(product));
    }

    return {
      products,
      totalCount,
      meta: { source: "database", configured: true },
    };
  }

  const { data, error } = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      let query = supabase.from("products").select(PRODUCT_SELECT);
      query = applyProductFilters(query, true) as typeof query;
      const result = await query.range(from, to);
      return {
        data: (result.data ?? []) as Record<string, unknown>[],
        error: result.error,
      };
    },
  );

  if (error) {
    if (isMissingDeletedAtColumnError(error)) {
      markSoftDeleteColumnMissing();
      return getProducts(categoryOrOptions);
    }

    return {
      ...staticProductsResult(),
      meta: { source: "static", configured: true, error },
    };
  }

  let products = data.map((row) => mapProductWithRelations(row));

  if (sort === "sale") {
    products = products.filter((product) => isProductOnSale(product));
  }

  products = sortProductsForList(products, listOrderOptions);

  return {
    products,
    totalCount: products.length,
    meta: { source: "database", configured: true },
  };
}

const PRIORITY_SKU_QUERY_BATCH = 500;

type PriorityBrandListFetchOptions = {
  categorySlug?: string;
  includeDraft?: boolean;
  importBatchId?: string;
  search?: string;
  brand?: string;
  brandExact?: boolean;
  sort?: ProductListSort;
  limit?: number;
  page?: number;
  orderBy?: "created_at" | "updated_at";
  deletionFilter?: ProductDeletionFilter;
  imageFirst?: boolean;
  lightSelect?: boolean;
  privileged?: boolean;
  listOrderOptions: ProductListOrderOptions;
  configured: boolean;
};

function paginateProductList(
  products: ProductWithRelations[],
  limit: number | undefined,
  page: number,
): { products: ProductWithRelations[]; totalCount: number } {
  if (limit == null) {
    return { products, totalCount: products.length };
  }

  const from = (page - 1) * limit;
  return {
    products: products.slice(from, from + limit),
    totalCount: products.length,
  };
}

async function fetchProductsByIdentifierBatchAdmin(
  supabase: SupabaseClient,
  values: string[],
  selectClause: string,
  options: {
    includeDraft?: boolean;
    deletionFilter?: ProductDeletionFilter;
  },
): Promise<Record<string, unknown>[]> {
  if (values.length === 0) {
    return [];
  }

  const inList = quoteInFilterValues(values);
  let query = supabase
    .from("products")
    .select(selectClause)
    .or(`sku.in.(${inList}),barcode.in.(${inList})`);

  if (!options.includeDraft) {
    query = query.eq("status", "active");
  }

  query = applyDeletedAtFilter(query, options.deletionFilter ?? "active");

  const result = await query;
  if (result.error) {
    return [];
  }

  return (result.data ?? []) as unknown as Record<string, unknown>[];
}

async function fetchPriorityBrandListProducts(
  options: PriorityBrandListFetchOptions,
): Promise<{ products: ProductWithRelations[]; totalCount: number; meta: FetchMeta }> {
  const priorityKeys = [...getBrandPriorityKeySet()];
  const {
    categorySlug,
    includeDraft,
    importBatchId,
    search,
    brand,
    brandExact,
    sort,
    limit,
    page = 1,
    deletionFilter = "active",
    lightSelect,
    privileged,
    listOrderOptions,
    configured,
  } = options;

  function finalize(products: ProductWithRelations[]) {
    let filtered = filterStaticProducts(products, {
      categorySlug,
      search,
      brand,
      brandExact,
      importBatchId,
      sort,
    });

    if (sort === "sale") {
      filtered = filtered.filter((product) => isProductOnSale(product));
    }

    const sorted = sortProductsForList(filtered, listOrderOptions);
    const { products: pagedProducts, totalCount } = paginateProductList(
      sorted,
      limit,
      page,
    );

    return {
      products: pagedProducts,
      totalCount,
      meta: { source: "database" as const, configured },
    };
  }

  if (priorityKeys.length === 0) {
    return {
      products: [],
      totalCount: 0,
      meta: { source: "static", configured },
    };
  }

  if (!configured) {
    let products = filterPriorityProducts(STATIC_PRODUCTS);
    if (deletionFilter === "deleted") {
      products = [];
    }
    return finalize(products);
  }

  const supabase = privileged
    ? createServiceClient() ?? (await createSafeClient())
    : await createSafeClient();

  if (!supabase) {
    let products = filterPriorityProducts(STATIC_PRODUCTS);
    if (deletionFilter === "deleted") {
      products = [];
    }
    return {
      ...finalize(products),
      meta: { source: "static", configured: false },
    };
  }

  await ensureSoftDeleteColumnProbed(supabase);

  const selectClause = lightSelect ? ADMIN_LIST_SELECT : PRODUCT_SELECT;
  const rowsById = new Map<string, Record<string, unknown>>();

  for (let index = 0; index < priorityKeys.length; index += PRIORITY_SKU_QUERY_BATCH) {
    const batch = priorityKeys.slice(index, index + PRIORITY_SKU_QUERY_BATCH);
    const batchRows = await fetchProductsByIdentifierBatchAdmin(
      supabase,
      batch,
      selectClause,
      { includeDraft, deletionFilter },
    );

    for (const row of batchRows) {
      const id = String(row.id);
      if (!rowsById.has(id)) {
        rowsById.set(id, row);
      }
    }
  }

  const products = [...rowsById.values()]
    .map((row) => mapProductWithRelations(row))
    .filter(
      (product) => !isDemoProduct(product) && productMatchesBrandPriority(product),
    );

  return finalize(products);
}

export async function getBrandPriorityListStats(): Promise<{
  targetCount: number;
  matchedCount: number;
}> {
  const targetCount = getBrandPriorityListTargetCount();
  const { totalCount } = await fetchPriorityBrandListProducts({
    includeDraft: true,
    privileged: true,
    deletionFilter: "active",
    listOrderOptions: { orderBy: "created_at", imageFirst: false },
    configured: isSupabaseConfigured(),
  });

  return { targetCount, matchedCount: totalCount };
}

export async function getCachedBrandPriorityListStats(): Promise<{
  targetCount: number;
  matchedCount: number;
}> {
  return unstable_cache(
    getBrandPriorityListStats,
    ["admin-brand-priority-list-stats"],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  )();
}

function filterPriorityProducts(products: ProductWithRelations[]): ProductWithRelations[] {
  return products.filter(
    (product) => !isDemoProduct(product) && productMatchesBrandPriority(product),
  );
}

function quoteInFilterValues(values: string[]): string {
  return values.map((value) => `"${value.replace(/"/g, '\\"')}"`).join(",");
}

async function fetchProductsByIdentifierBatch(
  supabase: SupabaseClient,
  values: string[],
  selectClause: string,
  categoryId: string | null,
  includeDraft: boolean | undefined,
): Promise<Record<string, unknown>[]> {
  if (values.length === 0) {
    return [];
  }

  const inList = quoteInFilterValues(values);
  let query = supabase
    .from("products")
    .select(selectClause)
    .or(`sku.in.(${inList}),barcode.in.(${inList})`)
    .order("created_at", { ascending: false });

  if (!includeDraft) {
    query = query.eq("status", "active");
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (isSoftDeleteColumnAvailable()) {
    query = query.is("deleted_at", null);
  }

  const result = await query;
  if (result.error) {
    return [];
  }

  return (result.data ?? []) as unknown as Record<string, unknown>[];
}

export async function getPriorityBrandProducts(options?: {
  limit?: number;
}): Promise<{ products: ProductWithRelations[]; totalCount: number; meta: FetchMeta }> {
  const limit = options?.limit ?? 200;
  return unstable_cache(
    () => fetchPriorityBrandProductsFromSource(limit),
    ["storefront-priority-products", String(limit)],
    { revalidate: CACHE_REVALIDATE_SECONDS },
  )();
}

async function fetchPriorityBrandProductsFromSource(
  limit: number,
): Promise<{ products: ProductWithRelations[]; totalCount: number; meta: FetchMeta }> {
  const configured = isSupabaseConfigured();
  const priorityKeys = [...getBrandPriorityKeySet()];

  if (!configured || priorityKeys.length === 0) {
    const products = filterPriorityProducts(STATIC_PRODUCTS).slice(0, limit);
    return {
      products,
      totalCount: products.length,
      meta: { source: "static", configured },
    };
  }

  const supabase = createPublicClient();
  if (!supabase) {
    const products = filterPriorityProducts(STATIC_PRODUCTS).slice(0, limit);
    return {
      products,
      totalCount: products.length,
      meta: { source: "static", configured: false },
    };
  }

  await ensureSoftDeleteColumnProbed(supabase);

  const rowsById = new Map<string, Record<string, unknown>>();

  for (let index = 0; index < priorityKeys.length; index += PRIORITY_SKU_QUERY_BATCH) {
    const batch = priorityKeys.slice(index, index + PRIORITY_SKU_QUERY_BATCH);
    const batchRows = await fetchProductsByIdentifierBatch(
      supabase,
      batch,
      PRODUCT_SELECT,
      null,
      false,
    );

    for (const row of batchRows) {
      const id = String(row.id);
      if (!rowsById.has(id)) {
        rowsById.set(id, row);
      }
    }
  }

  const products = [...rowsById.values()]
    .map((row) => mapProductWithRelations(row))
    .filter((product) => !isDemoProduct(product) && productMatchesBrandPriority(product))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);

  return {
    products,
    totalCount: products.length,
    meta: { source: "database", configured: true },
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<{ product: ProductWithRelations | null; meta: FetchMeta }> {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const product = STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
    return {
      product,
      meta: { source: "static", configured: false },
    };
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    const product = STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
    return {
      product,
      meta: { source: "static", configured: false },
    };
  }

  await ensureSoftDeleteColumnProbed(supabase);

  let detailQuery = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "active");

  if (isSoftDeleteColumnAvailable()) {
    detailQuery = detailQuery.is("deleted_at", null);
  }

  const { data, error } = await detailQuery.maybeSingle();

  if (error) {
    if (isMissingDeletedAtColumnError(error.message)) {
      markSoftDeleteColumnMissing();
      return getProductBySlug(slug);
    }

    const product = STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
    return {
      product,
      meta: { source: "static", configured: true, error: error.message },
    };
  }

  if (!data) {
    const product = STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
    return {
      product,
      meta: {
        source: product ? "static" : "database",
        configured: true,
      },
    };
  }

  return {
    product: mapProductWithRelations(data as Record<string, unknown>),
    meta: { source: "database", configured: true },
  };
}

export async function getAllProductsAdmin(): Promise<{
  products: ProductWithRelations[];
  meta: FetchMeta;
}> {
  const { products, meta } = await getProducts({
    includeDraft: true,
    imageFirst: true,
  });
  return { products, meta };
}

export async function getRecentlyUpdatedProducts(limit = 12): Promise<{
  products: ProductWithRelations[];
  meta: FetchMeta;
}> {
  const { products, meta } = await getProducts({
    includeDraft: true,
    limit,
    page: 1,
    orderBy: "updated_at",
    imageFirst: false,
  });
  return { products, meta };
}

export async function getProductImportBatches(): Promise<{
  batches: ProductImportBatch[];
  meta: FetchMeta;
}> {
  return fetchProductImportBatchesFromSource();
}

async function createAdminSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const serviceClient = createServiceClient();
  if (serviceClient) {
    return serviceClient;
  }

  return createSafeClient();
}

async function fetchProductImportBatchesFromSource(): Promise<{
  batches: ProductImportBatch[];
  meta: FetchMeta;
}> {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return {
      batches: [],
      meta: { source: "static", configured: false },
    };
  }

  const supabase = await createAdminSupabaseClient();
  if (!supabase) {
    return {
      batches: [],
      meta: { source: "static", configured: false },
    };
  }

  const { data, error } = await supabase
    .from("product_import_batches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return {
      batches: [],
      meta: { source: "database", configured: true, error: error.message },
    };
  }

  const rows = data ?? [];
  const productCounts = await Promise.all(
    rows.map(async (row) => {
      const batchId = String((row as Record<string, unknown>).id);
      const { count, error: countError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("import_batch_id", batchId);

      if (countError) {
        return null;
      }

      return count ?? 0;
    }),
  );

  return {
    batches: dedupeImportBatchesForAdmin(
      rows.map((row, index) => {
        const record = row as Record<string, unknown>;
        const linkedCount = productCounts[index];
        const importedCount = Number(record.imported_count ?? 0);
        const displayCount =
          linkedCount != null && linkedCount > 0 ? linkedCount : importedCount;
        return mapImportBatch(record, displayCount);
      }),
    ),
    meta: { source: "database", configured: true },
  };
}

function dedupeImportBatchesForAdmin(
  batches: ProductImportBatch[],
): ProductImportBatch[] {
  const seenFilenames = new Set<string>();

  return batches.filter((batch) => {
    if (batch.product_count <= 0 && batch.imported_count <= 0) {
      return false;
    }

    if (seenFilenames.has(batch.filename)) {
      return false;
    }

    seenFilenames.add(batch.filename);
    return true;
  });
}

export async function getProductBrands(): Promise<{
  brands: string[];
  meta: FetchMeta;
}> {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const brands = [
      ...new Set(
        STATIC_PRODUCTS.filter((product) => product.status === "active").map(
          (product) => product.brand,
        ),
      ),
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "en"));
    return {
      brands,
      meta: { source: "static", configured: false },
    };
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    const brands = [
      ...new Set(
        STATIC_PRODUCTS.filter((product) => product.status === "active").map(
          (product) => product.brand,
        ),
      ),
    ]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "en"));
    return {
      brands,
      meta: { source: "static", configured: false },
    };
  }

  await ensureSoftDeleteColumnProbed(supabase);

  const { data, error } = await fetchAllPages<{ brand: string }>(
    async (from, to) => {
      let query = supabase
        .from("products")
        .select("brand")
        .eq("status", "active")
        .order("brand", { ascending: true })
        .range(from, to);

      if (isSoftDeleteColumnAvailable()) {
        query = query.is("deleted_at", null);
      }

      const result = await query;

      return {
        data: (result.data ?? []) as { brand: string }[],
        error: result.error,
      };
    },
  );

  if (error) {
    if (isMissingDeletedAtColumnError(error)) {
      markSoftDeleteColumnMissing();
      return getProductBrands();
    }

    return {
      brands: [],
      meta: { source: "database", configured: true, error },
    };
  }

  const brands = [
    ...new Set(data.map((row) => row.brand?.trim()).filter(Boolean) as string[]),
  ].sort((a, b) => a.localeCompare(b, "en"));

  return {
    brands,
    meta: { source: "database", configured: true },
  };
}