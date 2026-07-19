export type AdminProductsSort = "recent" | null;

export type AdminProductsView = "active" | "deleted";

export type AdminProductsTab = "bulk" | "add" | "list";

export type AdminProductsFilters = {
  batchId: string | null;
  brandPriority: boolean;
  q: string | null;
  brand: string | null;
  category: string | null;
  sort: AdminProductsSort;
  view: AdminProductsView;
  tab?: AdminProductsTab | null;
};

export function resolveAdminProductsBrandPriority(
  priority: string | undefined | null,
): boolean {
  return priority?.trim() === "brand";
}

export function resolveAdminProductsTab(
  tab: string | undefined | null,
): AdminProductsTab {
  if (tab === "add" || tab === "list") {
    return tab;
  }
  return "bulk";
}

export type AdminProductsPaginationItem = number;

const ADMIN_PRODUCTS_PAGINATION_WINDOW = 10;

export function getAdminProductsPaginationItems(
  currentPage: number,
  totalPages: number,
  windowSize = ADMIN_PRODUCTS_PAGINATION_WINDOW,
): AdminProductsPaginationItem[] {
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

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function buildAdminProductsHref(
  filters: AdminProductsFilters,
  page = 1,
): string {
  const params = new URLSearchParams();
  if (filters.batchId) {
    params.set("batch", filters.batchId);
  }
  if (filters.brandPriority) {
    params.set("priority", "brand");
  }
  if (filters.q?.trim()) {
    params.set("q", filters.q.trim());
  }
  if (filters.brand?.trim()) {
    params.set("brand", filters.brand.trim());
  }
  if (filters.category?.trim()) {
    params.set("category", filters.category.trim());
  }
  if (filters.sort === "recent") {
    params.set("sort", "recent");
  }
  if (filters.view === "deleted") {
    params.set("view", "deleted");
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  if (filters.tab && filters.tab !== "bulk") {
    params.set("tab", filters.tab);
  }
  const query = params.toString();
  return query ? `/admin/products?${query}` : "/admin/products";
}
