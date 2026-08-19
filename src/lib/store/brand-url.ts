import { slugify } from "@/lib/utils";
import {
  getBrandFilterValue,
  getDisplayBrandName,
  normalizeBrandKey,
} from "@/lib/store/products-url";

export type BrandCatalogEntry = {
  slug: string;
  filterBrand: string;
  displayName: string;
};

export function brandNameToSlug(displayName: string): string {
  return slugify(getDisplayBrandName(displayName));
}

export function buildBrandCatalogEntries(rawBrands: string[]): {
  entries: BrandCatalogEntry[];
  collisionSlugs: string[];
} {
  const byCanonicalKey = new Map<string, BrandCatalogEntry>();
  const slugOwners = new Map<string, Set<string>>();

  for (const raw of rawBrands) {
    const filterBrand = getBrandFilterValue(raw);
    if (!filterBrand) {
      continue;
    }

    const displayName = getDisplayBrandName(filterBrand);
    const canonicalKey = normalizeBrandKey(filterBrand);
    if (byCanonicalKey.has(canonicalKey)) {
      continue;
    }

    const slug = brandNameToSlug(displayName);
    if (!slug) {
      continue;
    }

    const owners = slugOwners.get(slug) ?? new Set<string>();
    owners.add(canonicalKey);
    slugOwners.set(slug, owners);

    byCanonicalKey.set(canonicalKey, {
      slug,
      filterBrand,
      displayName,
    });
  }

  const collisionSlugs = [...slugOwners.entries()]
    .filter(([, owners]) => owners.size > 1)
    .map(([slug]) => slug);

  const collisionSet = new Set(collisionSlugs);
  const entries = [...byCanonicalKey.values()].filter((entry) => !collisionSet.has(entry.slug));

  return { entries, collisionSlugs };
}

export function resolveBrandCatalogEntry(
  slug: string,
  entries: BrandCatalogEntry[],
): BrandCatalogEntry | null {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) {
    return null;
  }

  return entries.find((entry) => entry.slug === normalizedSlug) ?? null;
}

export function buildBrandHref(slug: string): string {
  return `/brands/${encodeURIComponent(slug)}`;
}

export function buildBrandHubHref(
  slug: string,
  options?: { category?: string; page?: number },
): string {
  const params = new URLSearchParams();
  if (options?.category) {
    params.set("category", options.category);
  }
  if (options?.page && options.page > 1) {
    params.set("page", String(options.page));
  }

  const query = params.toString();
  return query ? `${buildBrandHref(slug)}?${query}` : buildBrandHref(slug);
}

export type BrandHubPageParam = {
  page: number;
  shouldRedirect: boolean;
  redirectPage: number;
};

export function parseBrandHubPageParam(raw: string | string[] | undefined): BrandHubPageParam {
  const hasDuplicate = Array.isArray(raw) && raw.length > 1;
  const pageQuery = Array.isArray(raw) ? raw.at(-1) : raw;
  if (!pageQuery?.trim()) {
    return { page: 1, shouldRedirect: false, redirectPage: 1 };
  }

  const trimmed = pageQuery.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { page: 1, shouldRedirect: true, redirectPage: 1 };
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (parsed < 1) {
    return { page: 1, shouldRedirect: true, redirectPage: 1 };
  }

  if (hasDuplicate || /^0\d+$/.test(trimmed) || parsed === 1) {
    return { page: parsed, shouldRedirect: true, redirectPage: parsed };
  }

  return { page: parsed, shouldRedirect: false, redirectPage: parsed };
}

export function resolveBrandHubPageOverflowTarget(
  requestedPage: number,
  totalCount: number,
  pageSize: number,
): number | null {
  if (totalCount === 0) {
    return requestedPage > 1 ? 1 : null;
  }

  const totalPages = Math.ceil(totalCount / pageSize);
  if (requestedPage > totalPages) {
    return totalPages;
  }

  return null;
}
