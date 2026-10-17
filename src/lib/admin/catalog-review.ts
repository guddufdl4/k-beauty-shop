export type ReviewProduct = {
  name: string;
  barcode: string | null;
  wholesale_price: number | null;
  compare_at_price: number | null;
  source_row?: Record<string, unknown> | null;
};

export function catalogReviewReasons(product: ReviewProduct): string[] {
  const reasons: string[] = [];
  if (product.source_row?.__price_review === "conflicting_source_prices") reasons.push("시트 가격 충돌");
  if (!(Number(product.compare_at_price) > 0)) reasons.push("소비자가 누락");
  if (!(Number(product.wholesale_price) > 0)) reasons.push("공급가 누락");
  if (product.source_row?.__barcode_review === "multiple_options_require_matching") reasons.push("옵션별 바코드 매칭 필요");
  else if (!product.barcode?.trim()) reasons.push("바코드 없음");
  else if (!/^([0-9]{8}|[0-9]{12,14})$/.test(product.barcode.trim())) reasons.push("바코드 형식 오류");
  if (product.source_row?.__name_review === "required") reasons.push("상품명 확인 필요");
  return reasons;
}

/** Clear only the review warnings addressed by an actual manual change. */
export function catalogReviewMetadataPatch(
  existing: Record<string, unknown>,
  patch: { name: string; barcode: string | null; wholesale_price: number | null; compare_at_price?: number | null },
): Record<string, unknown> | undefined {
  const metadata = { ...((existing.source_row as Record<string, unknown> | null) ?? {}) };
  let changed = false;
  if (patch.name !== existing.name && metadata.__name_review === "required") {
    metadata.__name_review = "manually_confirmed"; changed = true;
  }
  if (patch.barcode !== existing.barcode && /^([0-9]{8}|[0-9]{12,14})$/.test(patch.barcode ?? "")) {
    metadata.__barcode_review = "manually_confirmed"; changed = true;
  }
  const priceChanged = Number(patch.wholesale_price) !== Number(existing.wholesale_price ?? 0)
    || patch.compare_at_price !== undefined && patch.compare_at_price !== existing.compare_at_price;
  if (metadata.__price_review === "conflicting_source_prices" && priceChanged) {
    metadata.__price_review = "manually_confirmed"; changed = true;
  }
  return changed ? metadata : undefined;
}

export function catalogReviewExportRows(products: Array<ReviewProduct & { product_code?: string | null; brand: string; sku: string }>) {
  return products.map((product) => ({
    "HMT 상품번호": product.product_code ?? "",
    "브랜드": product.brand,
    "상품명": product.name,
    "바코드": product.barcode ?? "",
    "소비자가 (KRW)": product.compare_at_price && product.compare_at_price > 0 ? product.compare_at_price : null,
    "공급가 (KRW)": product.wholesale_price && product.wholesale_price > 0 ? product.wholesale_price : null,
    "확인 필요 항목": catalogReviewReasons(product).join(" / "),
    "원본 시트": String(product.source_row?.__sheet ?? ""),
    "원본 행": String(product.source_row?.__source_excel_row ?? ""),
  }));
}
