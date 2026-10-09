
/** Storefront USD = KRW / this rate. */
export const DEFAULT_USD_KRW_RATE = 1350;
export const MIN_ORDER_USD = 1000;

export function cartMeetsMinOrderUsd(subtotalKrw: number, usdKrwRate: number): boolean {
  if (!Number.isFinite(subtotalKrw) || subtotalKrw <= 0) {
    return false;
  }

  const rate =
    Number.isFinite(usdKrwRate) && usdKrwRate > 0 ? usdKrwRate : DEFAULT_USD_KRW_RATE;
  return subtotalKrw / rate >= MIN_ORDER_USD - 1e-9;
}
