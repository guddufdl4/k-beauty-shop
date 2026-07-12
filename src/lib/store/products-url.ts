export type ProductListSort = "sale" | "trending" | "latest";

export function parseProductListSort(value: string | undefined): ProductListSort | undefined {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "sale" || normalized === "trending" || normalized === "latest") {
    return normalized;
  }
  return undefined;
}

export function isProductOnSale(product: {
  price: number;
  compare_at_price: number | null;
}): boolean {
  return product.compare_at_price != null && product.compare_at_price > product.price;
}

export function isProductSoldOut(product: {
  sold_out?: boolean;
}): boolean {
  return Boolean(product.sold_out);
}

export function buildProductsHref(options: {
  category?: string;
  brand?: string;
  q?: string;
  page?: number;
  sort?: ProductListSort;
}): string {
  const params = new URLSearchParams();
  if (options.category) {
    params.set("category", options.category);
  }
  if (options.brand) {
    params.set("brand", options.brand);
  }
  if (options.q) {
    params.set("q", options.q);
  }
  if (options.sort) {
    params.set("sort", options.sort);
  }
  if (options.page && options.page > 1) {
    params.set("page", String(options.page));
  }
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}
