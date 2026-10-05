export const QUOTE_LIST_HREF = "/cart";
export const QUOTE_CONFIRM_HREF = "/quote/confirm";

export function quoteBoxCount(quantity: number, moq: number): number | null {
  const step = Math.max(1, Math.floor(moq) || 1);
  if (quantity <= 0) {
    return null;
  }
  if (quantity % step !== 0) {
    return null;
  }
  return quantity / step;
}
