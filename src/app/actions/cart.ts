"use server";

import { revalidatePath } from "next/cache";
import {
  addToCart as addToCartLib,
  removeFromCart as removeFromCartLib,
  updateCartQuantity as updateCartQuantityLib,
} from "@/lib/cart";

export type CartActionState = { error?: string; success?: string };

function revalidateCartPaths() {
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}

export async function addToCart(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const productId = String(formData.get("productId") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!productId) {
    return { error: "상품 정보가 없습니다." };
  }

  const result = await addToCartLib(productId, quantity);
  if (result.error) {
    return { error: result.error };
  }

  revalidateCartPaths();
  return { success: "장바구니에 담았습니다." };
}

export async function updateQuantity(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const productId = String(formData.get("productId") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!productId) {
    return { error: "상품 정보가 없습니다." };
  }

  const result = await updateCartQuantityLib(productId, quantity);
  if (result.error) {
    return { error: result.error };
  }

  revalidateCartPaths();
  return { success: "수량이 변경되었습니다." };
}

export async function removeFromCart(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    return { error: "상품 정보가 없습니다." };
  }

  const result = await removeFromCartLib(productId);
  if (result.error) {
    return { error: result.error };
  }

  revalidateCartPaths();
  return { success: "상품을 삭제했습니다." };
}

