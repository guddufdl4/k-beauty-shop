import { formatKRW } from "@/lib/utils";
import { isSupabaseConfigured } from "./config";
import { createSafeClient } from "./safe-server";

export const formatUsd = formatKRW;

export type ProductStatus = "draft" | "active" | "archived";

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
  weight_grams: number | null;
  ingredients: string | null;
  how_to_use: string | null;
  country_of_origin: string | null;
  status: ProductStatus;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWithRelations = Product & {
  category: Pick<Category, "id" | "name" | "slug"> | null;
  images: ProductImage[];
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

export const STATIC_PRODUCTS: ProductWithRelations[] = [
  {
    id: "static-hydra-serum",
    category_id: "static-skincare",
    name: "하이드라 수분 세럼",
    slug: "hydra-serum",
    description:
      "건조한 피부를 위한 수분 세럼. 해외 수출 인기 상품.",
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
    images: [],
  },
  {
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
    images: [],
  },
  {
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
    images: [],
  },
  {
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
    images: [],
  },
  {
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
    images: [],
  },
  {
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
    images: [],
  },
];

export const FALLBACK_PRODUCTS = STATIC_PRODUCTS;

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
      row.wholesale_price != null
        ? parseDecimal(row.wholesale_price)
        : null,
    compare_at_price:
      row.compare_at_price != null
        ? parseDecimal(row.compare_at_price)
        : null,
    moq: Number(row.moq ?? 1),
    stock: Number(row.stock ?? 0),
    weight_grams:
      row.weight_grams != null ? Number(row.weight_grams) : null,
    ingredients: row.ingredients ? String(row.ingredients) : null,
    how_to_use: row.how_to_use ? String(row.how_to_use) : null,
    country_of_origin: row.country_of_origin
      ? String(row.country_of_origin)
      : null,
    status: (row.status as ProductStatus) ?? "draft",
    is_featured: Boolean(row.is_featured),
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

export async function getCategories(): Promise<{
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

  const supabase = await createSafeClient();
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
  categoryOrOptions?: string | { categorySlug?: string; includeDraft?: boolean },
): Promise<{ products: ProductWithRelations[]; meta: FetchMeta }> {
  const options =
    typeof categoryOrOptions === "string"
      ? { categorySlug: categoryOrOptions }
      : categoryOrOptions;
  const configured = isSupabaseConfigured();
  const categorySlug = options?.categorySlug?.trim();

  if (!configured) {
    let products = STATIC_PRODUCTS;
    if (categorySlug) {
      products = products.filter((p) => p.category?.slug === categorySlug);
    }
    return {
      products,
      meta: { source: "static", configured: false },
    };
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    let products = STATIC_PRODUCTS;
    if (categorySlug) {
      products = products.filter((p) => p.category?.slug === categorySlug);
    }
    return {
      products,
      meta: { source: "static", configured: false },
    };
  }

  let query = supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name, slug),
      images:product_images(id, product_id, url, alt_text, sort_order, is_primary)
    `,
    )
    .order("created_at", { ascending: false });

  if (!options?.includeDraft) {
    query = query.eq("status", "active");
  }

  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();

    if (cat?.id) {
      query = query.eq("category_id", cat.id);
    } else {
      return {
        products: [],
        meta: { source: "database", configured: true },
      };
    }
  }

  const { data, error } = await query;

  if (error) {
    let products = STATIC_PRODUCTS;
    if (categorySlug) {
      products = products.filter((p) => p.category?.slug === categorySlug);
    }
    return {
      products,
      meta: { source: "static", configured: true, error: error.message },
    };
  }

  if (!data?.length) {
    return {
      products: [],
      meta: { source: "database", configured: true },
    };
  }

  const products: ProductWithRelations[] = data.map((row) => {
    const record = row as Record<string, unknown>;
    const categoryRaw = record.category as Record<string, unknown> | null;
    const imagesRaw = (record.images as Record<string, unknown>[] | null) ?? [];

    return {
      ...mapProduct(record),
      category: categoryRaw
        ? {
            id: String(categoryRaw.id),
            name: String(categoryRaw.name),
            slug: String(categoryRaw.slug),
          }
        : null,
      images: imagesRaw
        .map((img) => mapImage(img))
        .sort((a, b) => a.sort_order - b.sort_order),
    };
  });

  return {
    products,
    meta: { source: "database", configured: true },
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<{ product: ProductWithRelations | null; meta: FetchMeta }> {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const product =
      STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
    return {
      product,
      meta: { source: "static", configured: false },
    };
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    const product =
      STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
    return {
      product,
      meta: { source: "static", configured: false },
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(id, name, slug),
      images:product_images(id, product_id, url, alt_text, sort_order, is_primary)
    `,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    const product =
      STATIC_PRODUCTS.find((p) => p.slug === slug) ?? null;
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

  const record = data as Record<string, unknown>;
  const categoryRaw = record.category as Record<string, unknown> | null;
  const imagesRaw = (record.images as Record<string, unknown>[] | null) ?? [];

  return {
    product: {
      ...mapProduct(record),
      category: categoryRaw
        ? {
            id: String(categoryRaw.id),
            name: String(categoryRaw.name),
            slug: String(categoryRaw.slug),
          }
        : null,
      images: imagesRaw
        .map((img) => mapImage(img))
        .sort((a, b) => a.sort_order - b.sort_order),
    },
    meta: { source: "database", configured: true },
  };
}

export async function getAllProductsAdmin(): Promise<{
  products: ProductWithRelations[];
  meta: FetchMeta;
}> {
  return getProducts({ includeDraft: true });
}
