import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/service";
import type { ProductWithRelations } from "@/lib/supabase/products";

export type PartnerBrand = {
  name: string;
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

function normalizeBrandKey(name: string): string {
  return name.trim().toLowerCase();
}

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
      const key = normalizeBrandKey(entry.sheet);
      if (!seen.has(key)) {
        seen.add(key);
        brands.push(entry.sheet);
      }
    }

    return brands.length > 0 ? brands : FALLBACK_BRAND_NAMES;
  } catch {
    return FALLBACK_BRAND_NAMES;
  }
}

function buildOrderedBrandNames(products: ProductWithRelations[]): string[] {
  const productBrands = products.map((product) => product.brand).filter(Boolean);
  const productBrandSet = new Set(productBrands);

  if (productBrandSet.size === 0) {
    return getManifestBrandNames();
  }

  const manifestBrands = getManifestBrandNames();
  const ordered: string[] = [];

  for (const manifestBrand of manifestBrands) {
    const match = productBrands.find(
      (brand) => normalizeBrandKey(brand) === normalizeBrandKey(manifestBrand),
    );
    if (match && !ordered.some((brand) => normalizeBrandKey(brand) === normalizeBrandKey(match))) {
      ordered.push(match);
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
