export function barcodeVariants(value: string): string[] {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return [value.trim()].filter(Boolean);
  }

  const variants = new Set<string>([value.trim(), digits]);
  const stripped = digits.replace(/^0+/, "");
  if (stripped) {
    variants.add(stripped);
  }
  if (digits.length === 12) {
    variants.add(`0${digits}`);
  }
  if (digits.length === 13 && digits.startsWith("0")) {
    variants.add(digits.slice(1));
  }

  return [...variants];
}

export function normalizeBarcode(value: string | null | undefined): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

export function canonicalBarcode(value: string | null | undefined): string | null {
  const normalized = normalizeBarcode(value);
  if (!normalized) {
    return null;
  }

  return barcodeVariants(normalized).sort((left, right) => left.length - right.length)[0];
}

export type ProductDedupeFields = {
  sku: string;
  barcode?: string | null;
};

export function productDedupeKey(product: ProductDedupeFields): string {
  const barcode =
    canonicalBarcode(product.barcode) ?? canonicalBarcode(product.sku);
  if (barcode) {
    return `barcode:${barcode}`;
  }

  return `sku:${product.sku.trim().toLowerCase()}`;
}

export type ProductScoreFields = {
  price?: number | null;
  image_url?: string | null;
  description?: string | null;
  barcode?: string | null;
  category_id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  deleted_at?: string | null;
};

export function scoreProductForDedupe(product: ProductScoreFields): number {
  let score = 0;
  if (Number(product.price) > 0) {
    score += 4;
  }
  if (product.image_url) {
    score += 2;
  }
  if (product.description) {
    score += 1;
  }
  if (product.barcode) {
    score += 1;
  }
  if (product.category_id) {
    score += 1;
  }
  if (!product.deleted_at) {
    score += 3;
  }

  const updatedAt = product.updated_at ?? product.created_at;
  if (updatedAt) {
    score += new Date(updatedAt).getTime() / 1e15;
  }

  return score;
}

export function pickBestProduct<T extends ProductScoreFields>(products: T[]): T {
  return [...products].sort(
    (left, right) => scoreProductForDedupe(right) - scoreProductForDedupe(left),
  )[0];
}

export function normalizeImportSku(
  sku: string,
  barcode: string | null,
): string {
  const canonical = canonicalBarcode(barcode) ?? canonicalBarcode(sku);
  if (canonical) {
    return canonical;
  }

  return sku.trim();
}
