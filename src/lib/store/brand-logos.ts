import { brandNameToSlug } from "@/lib/store/brand-url";
import { normalizeBrandKey } from "@/lib/store/products-url";

/** Verified official brand wordmarks — assets in public/brands/logos/ (see scripts/download-brand-logos.mjs). */
export const OFFICIAL_BRAND_LOGO_BY_SLUG: Readonly<Record<string, string>> = {
  "3ce": "/brands/logos/3ce.svg",
  "anua": "/brands/logos/anua.svg",
  "arencia": "/brands/logos/arencia.png",
  "ariul": "/brands/logos/ariul.jpg",
  "atopalm": "/brands/logos/atopalm.svg",
  "black-rouge": "/brands/logos/black-rouge.png",
  "cosrx": "/brands/logos/cosrx.png",
  "round-lab": "/brands/logos/round-lab.png",
  "skinfood": "/brands/logos/skinfood.svg",
  "torriden": "/brands/logos/torriden.svg",
  "vt": "/brands/logos/vt.png",
};

export function getStaticBrandLogoUrl(slug: string): string | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return OFFICIAL_BRAND_LOGO_BY_SLUG[normalized] ?? null;
}

export function resolveBrandLogo(options: {
  slug?: string;
  displayName: string;
  filterBrand: string;
  dbLogoMap: Map<string, string>;
}): string | null {
  const { slug, displayName, filterBrand, dbLogoMap } = options;

  const fromDb =
    dbLogoMap.get(normalizeBrandKey(displayName)) ??
    dbLogoMap.get(normalizeBrandKey(filterBrand));
  if (fromDb) {
    return fromDb;
  }

  const slugKey = (slug ?? brandNameToSlug(displayName)).trim().toLowerCase();
  return getStaticBrandLogoUrl(slugKey);
}
