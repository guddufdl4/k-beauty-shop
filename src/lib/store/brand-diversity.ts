import { normalizeBrandKey } from "@/lib/store/products-url";

const DEFAULT_MAX_PER_BRAND = 2;

export function interleaveByBrand<T extends { id: string; brand: string }>(
  products: T[],
  maxPerBrand = DEFAULT_MAX_PER_BRAND,
): T[] {
  if (products.length <= 1) {
    return products;
  }

  const queues = new Map<string, T[]>();
  const order: string[] = [];

  for (const product of products) {
    const key = normalizeBrandKey(product.brand) || "__unknown__";
    if (!queues.has(key)) {
      queues.set(key, []);
      order.push(key);
    }
    queues.get(key)!.push(product);
  }

  const picked: T[] = [];
  const used = new Set<string>();
  const counts = new Map<string, number>();
  let progress = true;

  while (progress) {
    progress = false;
    for (const key of order) {
      if ((counts.get(key) ?? 0) >= maxPerBrand) {
        continue;
      }
      const queue = queues.get(key);
      const next = queue?.shift();
      if (!next || used.has(next.id)) {
        continue;
      }
      picked.push(next);
      used.add(next.id);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      progress = true;
    }
  }

  return picked;
}
