
/** Storefront USD = KRW / this rate. */
export const DEFAULT_USD_KRW_RATE = 1350;
export const MIN_ORDER_USD = 1000;

export function cartMeetsMinOrderUsd(subtotalKrw: number, usdKrwRate: number): boolean {
  if (!Number.isFinite(subtotalKrw) || subtotalKrw <= 0) {
    return false;
  }

  const rate =
    Number.isFinite(usdKrwRate) && usdKrwRate > 0 ? usdKrwRate : DEFAULT_USD_KRW_RATE;
  // Compare displayed USD cents so $1,000.00 never passes due to fractions.
  return Math.round(subtotalKrw / rate * 100) > MIN_ORDER_USD * 100;
}

export function minimumAdditionalKrw(subtotalKrw: number, rate: number): number {
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_KRW_RATE;
  return Math.max(0, (MIN_ORDER_USD + 0.01) * safeRate - subtotalKrw);
}
