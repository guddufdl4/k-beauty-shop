import selection from "@/data/curated-best-sellers.json";
const priority = new Map(selection.skus.map((sku, index) => [sku, index]));
/** External evidence order, with explicitly sold-out products after available products. */
export function sortExternalBestSellers<T extends { sku: string; sold_out?: boolean }>(products: T[]): T[] {
  return [...products].sort((a, b) => Number(Boolean(a.sold_out)) - Number(Boolean(b.sold_out)) || (priority.get(a.sku) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b.sku) ?? Number.MAX_SAFE_INTEGER));
}
