import { Link } from "@/i18n/navigation";
import { buildBrandHref } from "@/lib/store/brand-url";
import { DEFAULT_WHOLESALE_INQUIRY_HREF } from "@/lib/store/storefront-href";
import type { RelatedBrandHubItem } from "@/lib/supabase/brand-hub";

type CategoryLink = {
  href: string;
  label: string;
};

export function BrandHubAvailableCategories({
  label,
  links,
}: {
  label: string;
  links: CategoryLink[];
}) {
  if (links.length === 0) {
    return null;
  }

  return (
    <section className="mb-8" aria-labelledby="brand-available-categories">
      <h2
        id="brand-available-categories"
        className="text-sm font-semibold uppercase tracking-widest text-zinc-500"
      >
        {label}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="inline-flex min-h-10 items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:border-accent hover:text-accent"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BrandHubWholesaleCta({
  needQuoteLabel,
  requestQuoteLabel,
}: {
  needQuoteLabel: string;
  requestQuoteLabel: string;
}) {
  return (
    <aside className="mt-10 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-6 sm:px-6">
      <p className="text-base font-semibold text-zinc-900">{needQuoteLabel}</p>
      <Link
        href={DEFAULT_WHOLESALE_INQUIRY_HREF}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        {requestQuoteLabel}
      </Link>
    </aside>
  );
}

export function BrandHubRelatedBrands({
  label,
  brands,
}: {
  label: string;
  brands: RelatedBrandHubItem[];
}) {
  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="mt-12" aria-labelledby="brand-related-brands">
      <h2 id="brand-related-brands" className="text-lg font-bold text-zinc-900">
        {label}
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {brands.map((brand) => (
          <li key={brand.slug}>
            <Link
              href={buildBrandHref(brand.slug)}
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-center text-sm font-semibold text-zinc-800 hover:border-accent hover:text-accent"
            >
              {brand.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

