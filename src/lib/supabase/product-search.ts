import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./config";
import { createSafeClient } from "./safe-server";
import { createPublicClient } from "./service";
import {
  ensureSoftDeleteColumnProbed,
  isSoftDeleteColumnAvailable,
} from "./soft-delete";
import { STATIC_PRODUCTS, type ProductWithRelations } from "./products";

export type SearchSuggestionProduct = {
  id: string;
  name: string;
  brand: string;
  slug: string;
  sku: string;
};

export type SearchSuggestions = {
  products: SearchSuggestionProduct[];
  brands: string[];
};

export type RelatedSearchResult = {
  terms: string[];
};

const MIN_QUERY_LENGTH = 2;
const DEFAULT_SUGGESTION_LIMIT = 8;
const DEFAULT_RELATED_LIMIT = 8;

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function scoreFieldMatch(value: string, query: string): number {
  const normalizedValue = value.toLowerCase();
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedValue === normalizedQuery) {
    return 100;
  }
  if (normalizedValue.startsWith(normalizedQuery)) {
    return 80;
  }
  if (normalizedValue.includes(normalizedQuery)) {
    return 60;
  }

  let queryIndex = 0;
  for (const char of normalizedValue) {
    if (char === normalizedQuery[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === normalizedQuery.length) {
        return 35;
      }
    }
  }

  return 0;
}

function scoreProductMatch(
  product: Pick<ProductWithRelations, "name" | "brand" | "sku" | "barcode">,
  query: string,
): number {
  return Math.max(
    scoreFieldMatch(product.name, query),
    scoreFieldMatch(product.brand, query),
    scoreFieldMatch(product.sku, query),
    scoreFieldMatch(product.barcode ?? "", query),
  );
}

function productMatchesQuery(
  product: Pick<ProductWithRelations, "name" | "brand" | "sku" | "barcode" | "status">,
  query: string,
): boolean {
  if (product.status !== "active") {
    return false;
  }
  return scoreProductMatch(product, query) > 0;
}

function mapSuggestionProduct(
  product: Pick<ProductWithRelations, "id" | "name" | "brand" | "slug" | "sku">,
): SearchSuggestionProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    slug: product.slug,
    sku: product.sku,
  };
}

function buildSuggestionsFromProducts(
  products: ProductWithRelations[],
  query: string,
  limit: number,
): SearchSuggestions {
  const normalizedQuery = normalizeQuery(query);
  const rankedProducts = products
    .filter((product) => productMatchesQuery(product, query))
    .map((product) => ({
      product,
      score: scoreProductMatch(product, query),
    }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, limit);

  const brandScores = new Map<string, number>();
  for (const product of products) {
    if (product.status !== "active") {
      continue;
    }
    const brandScore = scoreFieldMatch(product.brand, query);
    if (brandScore <= 0) {
      continue;
    }
    const current = brandScores.get(product.brand) ?? 0;
    brandScores.set(product.brand, Math.max(current, brandScore));
  }

  const brands = [...brandScores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([brand]) => brand)
    .filter((brand) => !normalizeQuery(brand).includes(normalizedQuery))
    .slice(0, 5);

  return {
    products: rankedProducts.map(({ product }) => mapSuggestionProduct(product)),
    brands,
  };
}

function staticSuggestions(query: string, limit: number): SearchSuggestions {
  return buildSuggestionsFromProducts(STATIC_PRODUCTS, query, limit);
}

async function fetchSuggestionsFromDatabase(
  query: string,
  limit: number,
): Promise<SearchSuggestions | null> {
  const supabase = createPublicClient() ?? (await createSafeClient());
  if (!supabase) {
    return null;
  }

  await ensureSoftDeleteColumnProbed(supabase);

  const escaped = escapeIlikePattern(query);
  let productQuery = supabase
    .from("products")
    .select("id, name, brand, slug, sku, barcode, status")
    .eq("status", "active")
    .or(
      `name.ilike.%${escaped}%,sku.ilike.%${escaped}%,brand.ilike.%${escaped}%,barcode.ilike.%${escaped}%`,
    )
    .order("name", { ascending: true })
    .limit(Math.max(limit * 3, 24));

  if (isSoftDeleteColumnAvailable()) {
    productQuery = productQuery.is("deleted_at", null);
  }

  const { data, error } = await productQuery;
  if (error || !data?.length) {
    return error ? null : { products: [], brands: [] };
  }

  const products = data.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    brand: String(row.brand),
    slug: String(row.slug),
    sku: String(row.sku),
    barcode: row.barcode ? String(row.barcode) : null,
    status: "active" as const,
  }));

  return buildSuggestionsFromProducts(
    products.map((product) => ({
      ...product,
      category_id: null,
      description: null,
      short_description: null,
      price: 0,
      wholesale_price: null,
      compare_at_price: null,
      moq: 1,
      stock: 0,
      sold_out: false,
      weight_grams: null,
      ingredients: null,
      how_to_use: null,
      country_of_origin: null,
      import_batch_id: null,
      external_sku: null,
      source_row: null,
      image_url: null,
      content_status: "complete" as const,
      needs_image: false,
      needs_description: false,
      is_featured: false,
      deleted_at: null,
      created_at: "",
      updated_at: "",
      category: null,
      import_batch: null,
      images: [],
    })),
    query,
    limit,
  );
}

export async function getSearchSuggestions(
  query: string,
  limit = DEFAULT_SUGGESTION_LIMIT,
): Promise<SearchSuggestions> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { products: [], brands: [] };
  }

  if (!isSupabaseConfigured()) {
    return staticSuggestions(trimmed, limit);
  }

  const fromDb = await fetchSuggestionsFromDatabase(trimmed, limit);
  if (fromDb) {
    return fromDb;
  }

  return staticSuggestions(trimmed, limit);
}

async function fetchDistinctBrands(
  supabase: SupabaseClient,
  query: string,
  limit: number,
): Promise<string[]> {
  const escaped = escapeIlikePattern(query);
  let brandQuery = supabase
    .from("products")
    .select("brand")
    .eq("status", "active")
    .ilike("brand", `%${escaped}%`)
    .order("brand", { ascending: true })
    .limit(limit * 2);

  if (isSoftDeleteColumnAvailable()) {
    brandQuery = brandQuery.is("deleted_at", null);
  }

  const { data, error } = await brandQuery;
  if (error || !data?.length) {
    return [];
  }

  return [
    ...new Set(
      data
        .map((row) => String(row.brand ?? "").trim())
        .filter(Boolean),
    ),
  ].slice(0, limit);
}

function relatedTermsFromProducts(
  products: ProductWithRelations[],
  query: string,
  limit: number,
): string[] {
  const normalizedQuery = normalizeQuery(query);
  const terms = new Set<string>();

  for (const product of products) {
    if (product.status !== "active") {
      continue;
    }

    const brandScore = scoreFieldMatch(product.brand, query);
    if (brandScore > 0 && normalizeQuery(product.brand) !== normalizedQuery) {
      terms.add(product.brand);
    }

    const nameScore = scoreFieldMatch(product.name, query);
    if (nameScore >= 35 && normalizeQuery(product.name) !== normalizedQuery) {
      terms.add(product.name);
    }

    if (terms.size >= limit) {
      break;
    }
  }

  if (terms.size < limit) {
    for (const product of products) {
      if (product.status !== "active") {
        continue;
      }
      if (terms.has(product.brand)) {
        continue;
      }
      terms.add(product.brand);
      if (terms.size >= limit) {
        break;
      }
    }
  }

  return [...terms].slice(0, limit);
}

function staticRelatedTerms(query: string, limit: number): RelatedSearchResult {
  return { terms: relatedTermsFromProducts(STATIC_PRODUCTS, query, limit) };
}

export async function getRelatedSearchTerms(
  query: string,
  limit = DEFAULT_RELATED_LIMIT,
): Promise<RelatedSearchResult> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { terms: [] };
  }

  if (!isSupabaseConfigured()) {
    return staticRelatedTerms(trimmed, limit);
  }

  const supabase = createPublicClient() ?? (await createSafeClient());
  if (!supabase) {
    return staticRelatedTerms(trimmed, limit);
  }

  await ensureSoftDeleteColumnProbed(supabase);

  const escaped = escapeIlikePattern(trimmed);
  const prefix = trimmed.slice(0, Math.min(3, trimmed.length));
  const escapedPrefix = escapeIlikePattern(prefix);

  let productQuery = supabase
    .from("products")
    .select("name, brand, status")
    .eq("status", "active")
    .or(
      `name.ilike.%${escaped}%,brand.ilike.%${escaped}%,name.ilike.%${escapedPrefix}%,brand.ilike.%${escapedPrefix}%`,
    )
    .order("brand", { ascending: true })
    .limit(40);

  if (isSoftDeleteColumnAvailable()) {
    productQuery = productQuery.is("deleted_at", null);
  }

  const [{ data }, brands] = await Promise.all([
    productQuery,
    fetchDistinctBrands(supabase, trimmed, limit),
  ]);

  const productTerms = (data ?? [])
    .map((row) => ({
      name: String(row.name ?? ""),
      brand: String(row.brand ?? ""),
      status: "active" as const,
      sku: "",
      slug: "",
      id: "",
      barcode: null,
      category_id: null,
      description: null,
      short_description: null,
      price: 0,
      wholesale_price: null,
      compare_at_price: null,
      moq: 1,
      stock: 0,
      sold_out: false,
      weight_grams: null,
      ingredients: null,
      how_to_use: null,
      country_of_origin: null,
      import_batch_id: null,
      external_sku: null,
      source_row: null,
      image_url: null,
      content_status: "complete" as const,
      needs_image: false,
      needs_description: false,
      is_featured: false,
      deleted_at: null,
      created_at: "",
      updated_at: "",
      category: null,
      import_batch: null,
      images: [],
    }))
    .filter((product) => product.name || product.brand);

  const terms = new Set<string>([
    ...relatedTermsFromProducts(productTerms, trimmed, limit),
    ...brands.filter((brand) => normalizeQuery(brand) !== normalizeQuery(trimmed)),
  ]);

  return { terms: [...terms].slice(0, limit) };
}
