import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveNeedsImageFromFields } from "@/lib/product-images";

export type UpdatedProductImageRow = {
  id: string;
  name: string;
  barcode: string | null;
  wholesale_price: number | null;
  sku: string;
  slug: string;
  image_url: string | null;
};

export async function updateProductImageUrl(
  supabase: SupabaseClient,
  productId: string,
  imageUrl: string | null,
): Promise<{ product: UpdatedProductImageRow | null; error: string | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from("products")
    .select("description, name")
    .eq("id", productId)
    .maybeSingle();

  if (fetchError) {
    return { product: null, error: fetchError.message };
  }

  if (!existing) {
    return { product: null, error: "상품을 찾을 수 없습니다." };
  }

  const updatePayload = {
    image_url: imageUrl,
    needs_image: resolveNeedsImageFromFields({ image_url: imageUrl }),
    content_status:
      imageUrl && existing.description?.trim() ? "complete" : "pending",
  };

  const { data, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("id", productId)
    .select("id, name, barcode, wholesale_price, sku, slug, image_url")
    .maybeSingle();

  if (error) {
    return { product: null, error: error.message };
  }

  if (!data) {
    return { product: null, error: "상품을 찾을 수 없습니다." };
  }

  await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId)
    .eq("is_primary", true);

  if (imageUrl) {
    const { error: insertError } = await supabase.from("product_images").insert({
      product_id: productId,
      url: imageUrl,
      alt_text: existing.name ?? data.name,
      sort_order: 0,
      is_primary: true,
    });

    if (insertError) {
      return { product: null, error: insertError.message };
    }
  }

  return { product: data, error: null };
}
