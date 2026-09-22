import {
  applyDeletedAtFilter,
  STATIC_PRODUCTS,
  STOREFRONT_BRANDS_CACHE_TAG,
  type Category,
  type FetchMeta,
  type ProductWithRelations,
} from "@/lib/supabase/products";
import { unstable_cache } from "next/cache";
import { createSafeClient } from "@/lib/supabase/safe-server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  buildBrandCatalogEntries,
  resolveBrandCatalogEntry,
  type BrandCatalogEntry,
} from "@/lib/store/brand-url";
import {
  buildBrandCatalog,
  HOME_FEATURED_BRANDS,
  matchesBrandFilter,
  normalizeBrandKey,
  resolveBrandFilterValues,
} from "@/lib/store/products-url";
import { findNavAncestorCategory } from "@/lib/store/category-tree";
import {
  filterStorefrontCategories,
  pickStorefrontNavCategories,
} from "@/lib/store/localized-category";
import { resolveBrandLogo } from "@/lib/store/brand-logos";
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

export type FeaturedNavBrand = {
  slug: string;
  displayName: string;
  logoUrl: string | null;
};

export type NavBrandGroups = {
  featured: FeaturedNavBrand[];
  more: FeaturedNavBrand[];
};

const MAX_FEATURED_NAV_BRANDS = 6;
const MAX_MORE_NAV_BRANDS = 24;

function getStaticFallbackBrandNames(): string[] {
  return buildBrandCatalog(
    STATIC_PRODUCTS.filter((product) => product.status === "active").map(
      (product) => product.brand,
    ),
  );
}

function resolveNavCatalogBrandNames(brands: string[], meta: FetchMeta): string[] {
  if (brands.length > 0) {
    return brands;
  }

  if (meta.error || meta.source === "static") {
    return getStaticFallbackBrandNames();
  }

  return brands;
}

function resolveNavBrandLogo(
  entry: BrandCatalogEntry,
  logoMap: Map<string, string>,
): string | null {
  return resolveBrandLogo({
    slug: entry.slug,
    displayName: entry.displayName,
    filterBrand: entry.filterBrand,
    dbLogoMap: logoMap,
  });
}

function toFeaturedNavBrand(
  entry: BrandCatalogEntry,
  logoMap: Map<string, string>,
): FeaturedNavBrand {
  return {
    slug: entry.slug,
    displayName: entry.displayName,
    logoUrl: resolveNavBrandLogo(entry, logoMap),
  };
}

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

async function fetchNavBrandGroupsFromSource(): Promise<NavBrandGroups> {
  const [{ brands: productBrands, meta }, logoMap] = await Promise.all([
    getProductBrands(),
    getBrandLogoMap(),
  ]);
  const brands = resolveNavCatalogBrandNames(productBrands, meta);
  const { entries } = buildBrandCatalogEntries(brands);

  const entryByKey = new Map<string, BrandCatalogEntry>();
  for (const entry of entries) {
    entryByKey.set(normalizeBrandKey(entry.displayName), entry);
    entryByKey.set(normalizeBrandKey(entry.filterBrand), entry);
  }

  const featured: FeaturedNavBrand[] = [];
  const featuredSlugs = new Set<string>();

  for (const config of HOME_FEATURED_BRANDS) {
    if (!config.enabled || featured.length >= MAX_FEATURED_NAV_BRANDS) {
      continue;
    }

    const entry = entryByKey.get(normalizeBrandKey(config.displayName));
    if (!entry) {
      continue;
    }

    featured.push(toFeaturedNavBrand(entry, logoMap));
    featuredSlugs.add(entry.slug);
  }

  const more = entries
    .filter((entry) => !featuredSlugs.has(entry.slug))
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" }),
    )
    .slice(0, MAX_MORE_NAV_BRANDS)
    .map((entry) => toFeaturedNavBrand(entry, logoMap));

  return { featured, more };
}

export async function getNavBrandGroups(): Promise<NavBrandGroups> {
  return unstable_cache(
    fetchNavBrandGroupsFromSource,
    ["storefront-nav-brand-groups"],
    {
      revalidate: 300,
      tags: [STOREFRONT_BRANDS_CACHE_TAG],
    },
  )();
}

export async function getFeaturedNavBrands(): Promise<FeaturedNavBrand[]> {
  const { featured } = await getNavBrandGroups();
  return featured;
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
    logoUrl: resolveBrandLogo({
      slug: entry.slug,
      displayName: entry.displayName,
      filterBrand: entry.filterBrand,
      dbLogoMap: logoMap,
    }),
  }));

  return { items, meta, collisionSlugs };
}

const MAX_NEW_ORDER_BRANDS = 12;

async function fetchRecentBrandKeys(limit: number): Promise<string[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = await createSafeClient();
  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("products")
    .select("brand, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);

  query = applyDeletedAtFilter(query, "active") as typeof query;

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  const seen = new Set<string>();
  const keys: string[] = [];
  for (const row of data) {
    const brand = typeof row.brand === "string" ? row.brand.trim() : "";
    if (!brand) continue;
    const key = normalizeBrandKey(brand);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
    if (keys.length >= limit) break;
  }
  return keys;
}

export type OrderBrandGroups = {
  top: BrandDirectoryItem[];
  newest: BrandDirectoryItem[];
};

export async function getOrderBrandGroups(
  items: BrandDirectoryItem[],
): Promise<OrderBrandGroups> {
  const byKey = new Map<string, BrandDirectoryItem>();
  for (const item of items) {
    byKey.set(normalizeBrandKey(item.displayName), item);
    byKey.set(normalizeBrandKey(item.filterBrand), item);
  }

  const top: BrandDirectoryItem[] = [];
  const used = new Set<string>();
  for (const config of HOME_FEATURED_BRANDS) {
    if (!config.enabled) continue;
    const item = byKey.get(normalizeBrandKey(config.displayName));
    if (!item || used.has(item.slug)) continue;
    top.push(item);
    used.add(item.slug);
  }

  const recentKeys = await fetchRecentBrandKeys(MAX_NEW_ORDER_BRANDS + top.length + 8);
  const newest: BrandDirectoryItem[] = [];
  for (const key of recentKeys) {
    const item = byKey.get(key);
    if (!item || used.has(item.slug)) continue;
    newest.push(item);
    used.add(item.slug);
    if (newest.length >= MAX_NEW_ORDER_BRANDS) break;
  }

  if (newest.length < Math.min(MAX_NEW_ORDER_BRANDS, 6)) {
    for (const item of items) {
      if (used.has(item.slug)) continue;
      newest.push(item);
      used.add(item.slug);
      if (newest.length >= MAX_NEW_ORDER_BRANDS) break;
    }
  }

  return { top, newest };
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
  slug?: string,
): Promise<string | null> {
  const logoMap = await getBrandLogoMap();
  return resolveBrandLogo({
    slug,
    displayName,
    filterBrand,
    dbLogoMap: logoMap,
  });
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
