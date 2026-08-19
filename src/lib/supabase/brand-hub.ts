import {
  applyDeletedAtFilter,
  STATIC_PRODUCTS,
  type Category,
  type FetchMeta,
  type ProductWithRelations,
} from "@/lib/supabase/products";
import { createSafeClient } from "@/lib/supabase/safe-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  buildBrandCatalogEntries,
  resolveBrandCatalogEntry,
  type BrandCatalogEntry,
} from "@/lib/store/brand-url";
import {
  matchesBrandFilter,
  normalizeBrandKey,
  resolveBrandFilterValues,
} from "@/lib/store/products-url";
import { findNavAncestorCategory } from "@/lib/store/category-tree";
import {
  filterStorefrontCategories,
  pickStorefrontNavCategories,
} from "@/lib/store/localized-category";
import { getBrandLogoMap } from "@/lib/store/partner-brands";
import { getProductBrands } from "@/lib/supabase/products";

const BRAND_HUB_CATEGORY_SELECT = "category_id";
const BRAND_HUB_PAGE_SIZE = 1000;
const BRAND_HUB_MAX_PAGES = 500;
const MAX_CATEGORY_PARENT_DEPTH = 32;

export type BrandDirectoryItem = BrandCatalogEntry & {
  logoUrl: string | null;
};

export type BrandCategoryTab = {
  slug: string;
  name: string;
  count: number;
  sortOrder: number;
};

type BrandHubTabContext = {
  categoriesById: Map<string, Category>;
  navCategories: Category[];
};

function buildBrandHubTabContext(categories: Category[]): BrandHubTabContext {
  const visibleCategories = filterStorefrontCategories(categories);
  return {
    categoriesById: new Map(visibleCategories.map((category) => [category.id, category])),
    navCategories: pickStorefrontNavCategories(visibleCategories),
  };
}

export function resolveBrandHubTabSlug(
  categoryId: string,
  tabContext: BrandHubTabContext,
): string | null {
  const { categoriesById, navCategories } = tabContext;
  const start = categoriesById.get(categoryId);
  if (!start?.is_active) {
    return null;
  }

  const navAncestor = findNavAncestorCategory(
    [...categoriesById.values()],
    start,
    navCategories,
  );
  if (navAncestor?.is_active) {
    return navAncestor.slug;
  }

  let current: Category | undefined = start;
  const visited = new Set<string>();

  for (let depth = 0; depth < MAX_CATEGORY_PARENT_DEPTH; depth += 1) {
    if (!current || visited.has(current.id)) {
      return null;
    }
    visited.add(current.id);

    if (!current.parent_id) {
      return current.is_active ? current.slug : null;
    }

    const parent = categoriesById.get(current.parent_id);
    if (!parent) {
      return current.is_active ? current.slug : null;
    }
    current = parent;
  }

  return null;
}

function productMatchesBrandHubTabDiscovery(
  product: Pick<
    ProductWithRelations,
    "brand" | "status" | "image_url" | "category_id" | "deleted_at"
  >,
  filterBrand: string,
): boolean {
  if (product.status !== "active") {
    return false;
  }

  if (product.deleted_at != null) {
    return false;
  }

  if (!product.image_url?.trim()) {
    return false;
  }

  if (!product.category_id) {
    return false;
  }

  return matchesBrandFilter(product.brand, filterBrand, true);
}

function accumulateBrandHubTabCount(
  counts: Map<string, BrandCategoryTab>,
  categoryId: string,
  tabContext: BrandHubTabContext,
): void {
  const tabSlug = resolveBrandHubTabSlug(categoryId, tabContext);
  if (!tabSlug) {
    return;
  }

  const tabCategory = [...tabContext.categoriesById.values()].find(
    (category) => category.slug === tabSlug && category.is_active,
  );
  if (!tabCategory) {
    return;
  }

  const existing = counts.get(tabSlug);
  if (existing) {
    existing.count += 1;
    return;
  }

  counts.set(tabSlug, {
    slug: tabSlug,
    name: tabCategory.name,
    count: 1,
    sortOrder: tabCategory.sort_order ?? 0,
  });
}

function sortBrandCategoryTabs(
  tabs: BrandCategoryTab[],
  navCategories: Category[],
): BrandCategoryTab[] {
  const navOrder = new Map(navCategories.map((category, index) => [category.slug, index]));

  return [...tabs].sort((a, b) => {
    const aNav = navOrder.get(a.slug);
    const bNav = navOrder.get(b.slug);
    if (aNav != null && bNav != null) {
      return aNav - bNav;
    }
    if (aNav != null) {
      return -1;
    }
    if (bNav != null) {
      return 1;
    }
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.slug.localeCompare(b.slug, "en", { sensitivity: "base" });
  });
}

function discoverStaticBrandCategoryTabs(
  filterBrand: string,
  tabContext: BrandHubTabContext,
): BrandCategoryTab[] {
  const counts = new Map<string, BrandCategoryTab>();

  for (const product of STATIC_PRODUCTS) {
    if (!productMatchesBrandHubTabDiscovery(product, filterBrand) || !product.category_id) {
      continue;
    }

    accumulateBrandHubTabCount(counts, product.category_id, tabContext);
  }

  return sortBrandCategoryTabs([...counts.values()].filter((tab) => tab.count > 0), tabContext.navCategories);
}

async function discoverBrandCategoryTabs(
  filterBrand: string,
  tabContext: BrandHubTabContext,
): Promise<BrandCategoryTab[]> {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return discoverStaticBrandCategoryTabs(filterBrand, tabContext);
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return [];
  }

  const aliases = resolveBrandFilterValues(filterBrand);
  const counts = new Map<string, BrandCategoryTab>();
  let from = 0;

  for (let pageIndex = 0; pageIndex < BRAND_HUB_MAX_PAGES; pageIndex += 1) {
    let query = supabase
      .from("products")
      .select(BRAND_HUB_CATEGORY_SELECT)
      .eq("status", "active")
      .not("image_url", "is", null)
      .not("category_id", "is", null)
      .order("id", { ascending: true })
      .range(from, from + BRAND_HUB_PAGE_SIZE - 1);

    query = applyDeletedAtFilter(query, "active") as typeof query;

    if (aliases.length > 1) {
      query = query.in("brand", aliases);
    } else {
      query = query.eq("brand", filterBrand);
    }

    const { data, error } = await query;
    if (error) {
      return discoverStaticBrandCategoryTabs(filterBrand, tabContext);
    }

    const rows = data ?? [];
    for (const row of rows) {
      const categoryId = row.category_id ? String(row.category_id) : null;
      if (!categoryId) {
        continue;
      }
      accumulateBrandHubTabCount(counts, categoryId, tabContext);
    }

    if (rows.length < BRAND_HUB_PAGE_SIZE) {
      break;
    }

    from += BRAND_HUB_PAGE_SIZE;
  }

  return sortBrandCategoryTabs([...counts.values()].filter((tab) => tab.count > 0), tabContext.navCategories);
}

export async function getBrandDirectoryItems(): Promise<{
  items: BrandDirectoryItem[];
  meta: FetchMeta;
  collisionSlugs: string[];
}> {
  const [{ brands, meta }, logoMap] = await Promise.all([getProductBrands(), getBrandLogoMap()]);
  const { entries, collisionSlugs } = buildBrandCatalogEntries(brands);

  const items = entries.map((entry) => ({
    ...entry,
    logoUrl:
      logoMap.get(normalizeBrandKey(entry.displayName)) ??
      logoMap.get(normalizeBrandKey(entry.filterBrand)) ??
      null,
  }));

  return { items, meta, collisionSlugs };
}

export async function resolveBrandHubEntry(slug: string): Promise<BrandCatalogEntry | null> {
  const { brands } = await getProductBrands();
  const { entries, collisionSlugs } = buildBrandCatalogEntries(brands);

  if (collisionSlugs.includes(slug.trim().toLowerCase())) {
    return null;
  }

  return resolveBrandCatalogEntry(slug, entries);
}

export async function getBrandHubCategoryTabs(
  filterBrand: string,
  categories: Category[],
): Promise<{ tabs: BrandCategoryTab[] }> {
  const tabContext = buildBrandHubTabContext(categories);
  const tabs = await discoverBrandCategoryTabs(filterBrand, tabContext);
  return { tabs };
}

export async function getBrandHubLogoUrl(
  filterBrand: string,
  displayName: string,
): Promise<string | null> {
  const logoMap = await getBrandLogoMap();
  return (
    logoMap.get(normalizeBrandKey(displayName)) ??
    logoMap.get(normalizeBrandKey(filterBrand)) ??
    null
  );
}

export function isValidBrandCategorySlug(
  categorySlug: string | undefined,
  tabs: BrandCategoryTab[],
): boolean {
  if (!categorySlug?.trim()) {
    return true;
  }

  return tabs.some((tab) => tab.slug === categorySlug);
}
