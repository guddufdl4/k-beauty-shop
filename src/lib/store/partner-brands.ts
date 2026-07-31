import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/service";
import {
  getBrandFilterValue,
  HOME_FEATURED_BRANDS,
  normalizeBrandKey,
  resolveBrandFilterValues,
  resolveFeaturedBrandsFromProducts,
  type ResolvedFeaturedBrand,
} from "@/lib/store/products-url";
import type { ProductWithRelations } from "@/lib/supabase/products";

export type PartnerBrand = {
  name: string;
  logoUrl: string | null;
};

export type FeaturedBrand = ResolvedFeaturedBrand & {
  logoUrl: string | null;
};

const MANIFEST_PATH = resolve("data/priority-batches/manifest.json");

const FALLBACK_BRAND_NAMES = [
  "SKIN1004",
  "COSRX",
  "Dr.G",
  "ANUA",
  "Numbuzin",
  "Rom&nd",
  "skinfood",
  "VT",
  "Torriden",
  "Laneige",
  "Innisfree",
  "MEDICUBE",
  "Missha",
  "Purito",
  "Abib",
];

function getManifestBrandNames(): string[] {
  if (!existsSync(MANIFEST_PATH)) {
    return FALLBACK_BRAND_NAMES;
  }

  try {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as {
      sheets?: { sheet: string }[];
    };
    const seen = new Set<string>();
    const brands: string[] = [];

    for (const entry of manifest.sheets ?? []) {
      const displayName = getBrandFilterValue(entry.sheet);
      const key = normalizeBrandKey(displayName);
      if (!seen.has(key)) {
        seen.add(key);
        brands.push(displayName);
      }
    }

    return brands.length > 0 ? brands : FALLBACK_BRAND_NAMES;
  } catch {
    return FALLBACK_BRAND_NAMES;
  }
}

function buildOrderedBrandNames(products: ProductWithRelations[]): string[] {
  const productBrands = products
    .map((product) => getBrandFilterValue(product.brand))
    .filter(Boolean);
  const productBrandKeys = new Set(productBrands.map((brand) => normalizeBrandKey(brand)));

  if (productBrandKeys.size === 0) {
    return getManifestBrandNames();
  }

  const manifestBrands = getManifestBrandNames();
  const ordered: string[] = [];

  for (const manifestBrand of manifestBrands) {
    if (
      productBrandKeys.has(normalizeBrandKey(manifestBrand)) &&
      !ordered.some((brand) => normalizeBrandKey(brand) === normalizeBrandKey(manifestBrand))
    ) {
      ordered.push(manifestBrand);
    }
  }

  for (const brand of productBrands) {
    if (!ordered.some((existing) => normalizeBrandKey(existing) === normalizeBrandKey(brand))) {
      ordered.push(brand);
    }
  }

  return ordered;
}

async function fetchBrandLogoMap(): Promise<Map<string, string>> {
  if (!isSupabaseConfigured()) {
    return new Map();
  }

  const supabase = createPublicClient();
  if (!supabase) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("brands")
    .select("name, logo_url")
    .eq("is_active", true);

  if (error || !data) {
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data) {
    const logoUrl = row.logo_url?.trim();
    if (logoUrl) {
      map.set(normalizeBrandKey(String(row.name)), logoUrl);
    }
  }

  return map;
}

async function resolvePartnerBrandsFromSource(
  products: ProductWithRelations[],
): Promise<PartnerBrand[]> {
  const brandNames = buildOrderedBrandNames(products);
  const logoMap = await fetchBrandLogoMap();

  return brandNames.map((name) => ({
    name,
    logoUrl: logoMap.get(normalizeBrandKey(name)) ?? null,
  }));
}

export async function getPartnerBrands(
  products: ProductWithRelations[],
): Promise<PartnerBrand[]> {
  return resolvePartnerBrandsFromSource(products);
}

async function findFeaturedBrandFilterInDatabase(
  displayName: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createPublicClient();
  if (!supabase) {
    return null;
  }

  for (const candidate of resolveBrandFilterValues(displayName)) {
    const { data, error } = await supabase
      .from("products")
      .select("brand")
      .eq("status", "active")
      .ilike("brand", candidate)
      .limit(1);

    if (error || !data?.[0]?.brand) {
      continue;
    }

    return getBrandFilterValue(String(data[0].brand));
  }

  return null;
}

export async function resolveFeaturedBrands(
  products: ProductWithRelations[],
): Promise<FeaturedBrand[]> {
  const fromPool = resolveFeaturedBrandsFromProducts(products);
  const byDisplayName = new Map(fromPool.map((brand) => [brand.displayName, brand]));

  for (const config of HOME_FEATURED_BRANDS) {
    if (!config.enabled || byDisplayName.has(config.displayName)) {
      continue;
    }

    const filterBrand = await findFeaturedBrandFilterInDatabase(config.displayName);
    if (filterBrand) {
      byDisplayName.set(config.displayName, {
        displayName: config.displayName,
        filterBrand,
      });
    }
  }

  const brands = HOME_FEATURED_BRANDS.filter((config) => config.enabled)
    .map((config) => byDisplayName.get(config.displayName))
    .filter((brand): brand is ResolvedFeaturedBrand => Boolean(brand));

  const logoMap = await fetchBrandLogoMap();

  return brands.map((brand) => ({
    ...brand,
    logoUrl:
      logoMap.get(normalizeBrandKey(brand.displayName)) ??
      logoMap.get(normalizeBrandKey(brand.filterBrand)) ??
      null,
  }));
}
