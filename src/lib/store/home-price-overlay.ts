import type { Product } from "@/lib/supabase/products";
import type { StorefrontAudience, StorefrontProduct } from "./product-visibility";

export type HomePriceSnapshot = Pick<Product, "id" | "price" | "wholesale_price" | "compare_at_price" | "stock" | "moq" | "sold_out" | "updated_at">;

/** Public catalog is reusable; prices are fetched through the current approved session on every request. */
export function attachHomePrices(products: StorefrontProduct[], prices: HomePriceSnapshot[], audience: StorefrontAudience): StorefrontProduct[] {
  if (audience === "guest") return products;
  const byId = new Map(prices.map(price => [price.id, price]));
  return products.flatMap(product => {
    const price = byId.get(product.id);
    // A product archived/deleted since the public cache was filled must not reappear.
    return price ? [{ ...product, ...price, source_row: null, status: "active" as const,
      import_batch_id: null, external_sku: null, content_status: "complete" as const,
      needs_image: false, needs_description: false, deleted_at: null }] : [];
  });
}
