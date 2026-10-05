import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { usableShopPrice } from "@/lib/store/products-url";

/** Called only after the storefront has resolved a visible product. */
export async function getPublicRetailPrice(productId: string): Promise<number | null> {
  const client = createServiceClient();
  if (!client) return null;

  // Return only the public MSRP; supply prices and stock remain private.
  const { data, error } = await client
    .from("products")
    .select("compare_at_price")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return usableShopPrice(Number(data.compare_at_price));
}
