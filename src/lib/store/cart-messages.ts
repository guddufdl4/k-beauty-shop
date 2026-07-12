import type { CartLibErrorCode, CartLibResult } from "@/lib/cart";

type CartTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

const ERROR_KEY_BY_CODE: Record<CartLibErrorCode, string> = {
  invalid_quantity: "errors.invalidQuantity",
  moq_not_met: "errors.moqNotMet",
  insufficient_stock: "errors.insufficientStock",
  product_not_found: "errors.productNotFound",
  cart_unavailable: "errors.cartUnavailable",
  cart_empty: "errors.cartEmpty",
  order_unavailable: "errors.orderUnavailable",
  order_create_failed: "errors.orderCreateFailed",
};

export function formatCartLibError(
  result: CartLibResult,
  t: CartTranslator,
): string | undefined {
  if (result.errorCode) {
    const key = ERROR_KEY_BY_CODE[result.errorCode];
    return t(key, result.errorParams);
  }
  return result.error;
}