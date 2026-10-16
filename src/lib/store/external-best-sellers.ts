import selection from "@/data/curated-best-sellers.json";
const priority = new Map(selection.skus.map((sku, index) => [sku, index]));
export function externalBestSellerRank(sku:string):number | null { return priority.has(sku)?priority.get(sku)!+1:null; }
/** Availability first, then verified external evidence. Unknown products retain their existing order. */
export function compareExternalBestSellers(a:{sku:string;sold_out?:boolean},b:{sku:string;sold_out?:boolean}):number {
 return Number(Boolean(a.sold_out))-Number(Boolean(b.sold_out)) || (priority.get(a.sku)??Number.MAX_SAFE_INTEGER)-(priority.get(b.sku)??Number.MAX_SAFE_INTEGER);
}
export function sortExternalBestSellers<T extends { sku: string; sold_out?: boolean }>(products: T[]): T[] {
 return [...products].sort(compareExternalBestSellers);
}
