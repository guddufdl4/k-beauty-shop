/** Match every word across product identity fields, without treating volume as a code. */
export function buildProductSearchFilter(input: string, includeProductCode: boolean): string {
  const fields = ["name", "brand", "sku", "barcode", ...(includeProductCode ? ["product_code"] : []),
    ...["Product name", "Product Name", "Product Name (EN)", "Product Name (KR)", "제품명", "상품명"].map(key => `source_row->>"${key}"`)];
  const pattern = (value: string) => `"%${value.replace(/[%_\\]/g, "\\$&").replace(/"/g, '\\"')}%"`;
  const terms = input.trim().split(/\s+/).filter(Boolean);
  const groups = terms.map(term => `or(${fields.map(field => `${field}.ilike.${pattern(term)}`).join(",")})`);
  // Compact HMT codes are supported only when the whole query is a code.
  const code = input.trim().match(/^HMT\s*-?\s*(\d+)$/i);
  if (includeProductCode && code) return `product_code.ilike.${pattern(code[1])}`;
  return groups.length === 1 ? groups[0].slice(3, -1) : `and(${groups.join(",")})`;
}
