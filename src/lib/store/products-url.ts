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

export type ProductsPaginationItem = number | "ellipsis";

const PRODUCTS_PAGINATION_WINDOW = 10;

export function getProductsPaginationItems(
  currentPage: number,
  totalPages: number,
  windowSize = PRODUCTS_PAGINATION_WINDOW,
): ProductsPaginationItem[] {
  if (totalPages <= 1) {
    return [];
  }

  const safeWindow = Math.max(1, Math.floor(windowSize));
  if (totalPages <= safeWindow) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = currentPage - Math.floor(safeWindow / 2);
  let end = start + safeWindow - 1;

  if (start < 1) {
    start = 1;
    end = safeWindow;
  }

  if (end > totalPages) {
    end = totalPages;
    start = totalPages - safeWindow + 1;
  }

  const items: ProductsPaginationItem[] = [];

  if (start > 1) {
    items.push(1);
    if (start > 2) {
      items.push("ellipsis");
    }
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      items.push("ellipsis");
    }
    items.push(totalPages);
  }

  return items;
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
