"use server";

import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";

export type ProductFormState = {
  error?: string;
  success?: string;
};

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const { configured, profile } = await getSessionProfile();

  if (!configured) {
    return {
      error: "Supabase가 설정되지 않았습니다. .env.local을 확인하세요.",
    };
  }

  if (!profile) {
    return { error: "로그인이 필요합니다." };
  }

  if (profile.role !== "admin") {
    return { error: "관리자 권한이 필요합니다." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const price = Number(formData.get("price"));
  const wholesalePriceRaw = String(formData.get("wholesale_price") ?? "").trim();
  const moq = Number(formData.get("moq") ?? 1);
  const stock = Number(formData.get("stock") ?? 0);
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!name || !brand || !sku || !price) {
    return { error: "상품명, 브랜드, SKU, 가격은 필수입니다." };
  }

  const slug = slugInput || slugify(name);
  const wholesale_price = wholesalePriceRaw
    ? Number(wholesalePriceRaw)
    : null;

  const supabase = await createSafeClient();
  if (!supabase) {
    return { error: "Supabase 클라이언트를 생성할 수 없습니다." };
  }

  const { error } = await supabase.from("products").insert({
    name,
    brand,
    sku,
    slug,
    price,
    wholesale_price,
    moq: moq || 1,
    stock: stock || 0,
    category_id: categoryId || null,
    description: description || null,
    status: "active",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");

  return { success: `"${name}" 상품이 등록되었습니다.` };
}
