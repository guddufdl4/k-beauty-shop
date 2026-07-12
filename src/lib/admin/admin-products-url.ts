export type AdminProductsSort = "recent" | null;

export type AdminProductsView = "active" | "deleted";

export type AdminProductsTab = "bulk" | "add" | "list";

export type AdminProductsFilters = {
  batchId: string | null;
  q: string | null;
  brand: string | null;
  category: string | null;
  sort: AdminProductsSort;
  view: AdminProductsView;
  tab?: AdminProductsTab | null;
};

export function resolveAdminProductsTab(
  tab: string | undefined | null,
): AdminProductsTab {
  if (tab === "add" || tab === "list") {
    return tab;
  }
  return "bulk";
}

export function buildAdminProductsHref(
  filters: AdminProductsFilters,
  page = 1,
): string {
  const params = new URLSearchParams();
  if (filters.batchId) {
    params.set("batch", filters.batchId);
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
