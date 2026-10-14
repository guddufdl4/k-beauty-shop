/** Supplier MOQ is a minimum, never a box multiple or maximum quantity. */
export function getMoqStep(moq: number | null | undefined): number {
  const n = Number(moq);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
export function isValidMoqQuantity(quantity: number, moq: number | null | undefined): boolean {
  return Number.isSafeInteger(quantity) && quantity >= getMoqStep(moq);
}
export function snapToMoqQuantity(quantity: number, moq: number | null | undefined): number {
  const minimum = getMoqStep(moq);
  return Number.isFinite(quantity) ? Math.max(minimum, Math.round(quantity)) : minimum;
}
export function stepMoqQuantity(quantity: number, moq: number | null | undefined, direction: 1 | -1): number {
  return snapToMoqQuantity(quantity + direction, moq);
}
