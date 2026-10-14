import { getMoqStep } from "./moq-quantity";
export function validateQuoteQuantity(product: { moq: number; sold_out?: boolean }, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return { errorCode: "invalid_quantity" as const };
  if (product.sold_out) return { errorCode: "out_of_stock" as const };
  const step = getMoqStep(product.moq);
  if (quantity < step) return { errorCode: "moq_not_met" as const, errorParams: { moq: step } };
  // HMT sources goods after quotation; on-hand stock is never a quantity limit.
  return null;
}
