import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import type {
  Product,
  ProductImage,
  ProductImportBatchSummary,
  ProductWithRelations,
} from "@/lib/supabase/products";

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
] as const;

const MEMBER_PRICE_COLUMNS = ["price", "wholesale_price", "compare_at_price"] as const;

const PRODUCT_RELATIONS_SUFFIX = `
  category:categories(id, name, slug),
  images:product_images(id, product_id, url, alt_text, sort_order, is_primary)
`;

export function buildGuestProductSelect(): string {
  return `${GUEST_PRODUCT_COLUMNS.join(", ")},${PRODUCT_RELATIONS_SUFFIX}`;
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
  return {
    id: product.id,
    category_id: product.category_id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    short_description: product.short_description,
    brand: product.brand,
    sku: product.sku,
    barcode: product.barcode,
    moq: product.moq,
    sold_out: product.sold_out,
    weight_grams: product.weight_grams,
    ingredients: product.ingredients,
    how_to_use: product.how_to_use,
    country_of_origin: product.country_of_origin,
    is_featured: product.is_featured,
    is_best_seller: product.is_best_seller,
    image_url: product.image_url,
    created_at: product.created_at,
    updated_at: product.updated_at,
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
  if (canViewProductPrices(audience)) {
    return product;
  }

  return toPublicProductWithRelations(product);
}

export function toStorefrontProducts(
  products: ProductWithRelations[],
  audience: StorefrontAudience,
): StorefrontProduct[] {
  if (canViewProductPrices(audience)) {
    return products;
  }

  return products.map(toPublicProductWithRelations);
}

export function storefrontCacheAudienceKey(audience: StorefrontAudience): string {
  return canViewProductPrices(audience) ? "priced" : "public";
}