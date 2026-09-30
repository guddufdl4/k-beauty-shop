/** Product MOQ used as the quantity step. Missing/invalid MOQ falls back to 1 (catalog default). */
export function getMoqStep(moq: number | null | undefined): number {
  const n = Number(moq);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.floor(n);
}

export function isValidMoqQuantity(
  quantity: number,
  moq: number | null | undefined,
): boolean {
  const step = getMoqStep(moq);
  return Number.isInteger(quantity) && quantity >= step && quantity % step === 0;
}

export function snapToMoqQuantity(
  quantity: number,
  moq: number | null | undefined,
  max = Number.POSITIVE_INFINITY,
): number {
  const step = getMoqStep(moq);
  if (!Number.isFinite(quantity)) {
    return step;
  }

  const rounded = Math.round(quantity / step) * step;
  let next = Math.max(step, rounded);

  if (Number.isFinite(max)) {
    const maxValid = Math.floor(max / step) * step;
    if (maxValid >= step) {
      next = Math.min(next, maxValid);
    }
  }

  return next;
}

export function stepMoqQuantity(
  quantity: number,
  moq: number | null | undefined,
  direction: 1 | -1,
  max = Number.POSITIVE_INFINITY,
): number {
  const step = getMoqStep(moq);
  if (!isValidMoqQuantity(quantity, step)) {
    const nextInvalid =
      direction === 1
        ? Math.ceil(quantity / step) * step
        : Math.floor(quantity / step) * step;
    return snapToMoqQuantity(nextInvalid, step, max);
  }
  return snapToMoqQuantity(quantity + direction * step, step, max);
}
