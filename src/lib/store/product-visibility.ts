import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import type {
  Product,
  ProductImage,
  ProductImportBatchSummary,
  ProductWithRelations,
} from "@/lib/supabase/products";
import { omitProductSourceRow, withLocalizedNameFields } from "@/lib/store/localized-product-name";

export type StorefrontAudience = "guest" | "member" | "admin";

export async function resolveStorefrontAudience(): Promise<StorefrontAudience> {
  const { configured, user, profile } = await getSessionProfile();

  if (!configured || !user) {
    return "guest";
  }

  if (profile?.role === "admin") {
    return "admin";
  }

  return "member";
}

export function canViewProductPrices(audience: StorefrontAudience): boolean {
  return audience === "member" || audience === "admin";
}

/** Storefront guest-safe product fields (no price, stock, or internal admin columns). */
export type PublicProduct = Omit<
  Product,
  | "price"
  | "wholesale_price"
  | "compare_at_price"
  | "import_batch_id"
  | "external_sku"
  | "source_row"
  | "stock"
  | "content_status"
  | "needs_image"
  | "needs_description"
  | "status"
  | "deleted_at"
>;

export type PublicProductWithRelations = PublicProduct & {
  category: ProductWithRelations["category"];
  images: ProductImage[];
  import_batch: ProductImportBatchSummary | null;
};

export type StorefrontProduct = ProductWithRelations | PublicProductWithRelations;

/** Columns returned to guest clients and anon SELECT projections. */
const GUEST_PRODUCT_COLUMNS = [
  "id",
  "category_id",
  "name",
  "slug",
  "description",
  "short_description",
  "brand",
  "sku",
  "barcode",
  "moq",
  "sold_out",
  "weight_grams",
  "ingredients",
  "how_to_use",
  "country_of_origin",
  "is_featured",
  "is_best_seller",
  "image_url",
  "meta_title",
  "meta_description",
  "created_at",
  "updated_at",
] as const;

/** Member/admin-only columns (not in guest SELECT or DTO). */
const MEMBER_INTERNAL_COLUMNS = [
  "stock",
  "content_status",
  "needs_image",
  "needs_description",
  "status",
  "deleted_at",
  "source_row",
] as const;

const MEMBER_PRICE_COLUMNS = ["price", "wholesale_price", "compare_at_price"] as const;

const PRODUCT_RELATIONS_SUFFIX = `
  category:categories(id, name, slug),
  images:product_images(id, product_id, url, alt_text, sort_order, is_primary)
`;

const GUEST_LIST_PRODUCT_COLUMNS = [
  "id",
  "category_id",
  "name",
  "slug",
  "short_description",
  "brand",
  "sku",
  "barcode",
  "moq",
  "sold_out",
  "is_featured",
  "is_best_seller",
  "image_url",
  "created_at",
  "updated_at",
] as const;

export function buildGuestProductSelect(): string {
  return `${GUEST_PRODUCT_COLUMNS.join(", ")},${PRODUCT_RELATIONS_SUFFIX}`;
}

/** Lighter projection for paginated storefront grids (card fields only). */
export function buildGuestListProductSelect(): string {
  return `${GUEST_LIST_PRODUCT_COLUMNS.join(", ")},${PRODUCT_RELATIONS_SUFFIX}`;
}

const MEMBER_LIST_PRODUCT_COLUMNS = [
  ...GUEST_LIST_PRODUCT_COLUMNS,
  "stock",
  ...MEMBER_PRICE_COLUMNS,
] as const;

export function buildMemberListProductSelect(): string {
  return `${MEMBER_LIST_PRODUCT_COLUMNS.join(", ")},${PRODUCT_RELATIONS_SUFFIX}`;
}

export function buildMemberProductSelect(): string {
  return `${[...GUEST_PRODUCT_COLUMNS, ...MEMBER_INTERNAL_COLUMNS, ...MEMBER_PRICE_COLUMNS].join(", ")},${PRODUCT_RELATIONS_SUFFIX}`;
}

export function isPricedStorefrontProduct(
  product: StorefrontProduct,
): product is ProductWithRelations {
  return "price" in product && typeof (product as { price?: number }).price === "number";
}

function projectPublicProduct(product: Product): PublicProduct {
  const named = withLocalizedNameFields(product);
  return {
    id: named.id,
    category_id: named.category_id,
    name: named.name,
    slug: named.slug,
    description: named.description,
    short_description: named.short_description,
    brand: named.brand,
    sku: named.sku,
    barcode: named.barcode,
    moq: named.moq,
    sold_out: named.sold_out,
    weight_grams: named.weight_grams,
    ingredients: named.ingredients,
    how_to_use: named.how_to_use,
    country_of_origin: named.country_of_origin,
    is_featured: named.is_featured,
    is_best_seller: named.is_best_seller,
    image_url: named.image_url,
    created_at: named.created_at,
    updated_at: named.updated_at,
    name_en: named.name_en,
    name_ko: named.name_ko,
  };
}

export function toPublicProduct(product: Product): PublicProduct {
  return projectPublicProduct(product);
}

export function toPublicProductWithRelations(
  product: ProductWithRelations,
): PublicProductWithRelations {
  return {
    ...projectPublicProduct(product),
    category: product.category,
    images: product.images,
    import_batch: null,
  };
}

export function toStorefrontProduct(
  product: ProductWithRelations,
  audience: StorefrontAudience,
): StorefrontProduct {
  const named = omitProductSourceRow(withLocalizedNameFields(product));
  if (canViewProductPrices(audience)) {
    return named;
  }

  return toPublicProductWithRelations(named);
}

export function toStorefrontProducts(
  products: ProductWithRelations[],
  audience: StorefrontAudience,
): StorefrontProduct[] {
  return products.map((product) => toStorefrontProduct(product, audience));
}

export function storefrontCacheAudienceKey(audience: StorefrontAudience): string {
  return canViewProductPrices(audience) ? "priced" : "public";
}