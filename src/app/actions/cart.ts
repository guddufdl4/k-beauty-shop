"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  addToCart as addToCartLib,
  removeFromCart as removeFromCartLib,
  updateCartQuantity as updateCartQuantityLib,
} from "@/lib/cart";
import { formatCartLibError } from "@/lib/store/cart-messages";

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
  const t = await getTranslations("cart");
  const productId = String(formData.get("productId") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!productId) {
    return { error: t("errors.missingProduct") };
  }

  const result = await addToCartLib(productId, quantity);
  const error = formatCartLibError(result, t);
  if (error) {
    return { error };
  }

  revalidateCartPaths();
  return { success: t("addedSuccess") };
}

export async function updateQuantity(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const t = await getTranslations("cart");
  const productId = String(formData.get("productId") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 1);

  if (!productId) {
    return { error: t("errors.missingProduct") };
  }

  const result = await updateCartQuantityLib(productId, quantity);
  const error = formatCartLibError(result, t);
  if (error) {
    return { error };
  }

  revalidateCartPaths();
  return { success: t("quantityUpdated") };
}

export async function removeFromCart(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const t = await getTranslations("cart");
  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    return { error: t("errors.missingProduct") };
  }

  const result = await removeFromCartLib(productId);
  const error = formatCartLibError(result, t);
  if (error) {
    return { error };
  }

  revalidateCartPaths();
  return { success: t("itemRemoved") };
}
