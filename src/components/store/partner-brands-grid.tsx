"use client";

import { Link } from "@/i18n/navigation";
import { useMemo, useState } from "react";
import type { PartnerBrand } from "@/lib/store/partner-brands";

const BRANDS_PER_PAGE = 15;

type PartnerBrandsGridProps = {
  title: string;
  brands: PartnerBrand[];
};

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

export function PartnerBrandsGrid({ title, brands }: PartnerBrandsGridProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const pages = useMemo(() => chunk(brands, BRANDS_PER_PAGE), [brands]);
  const totalPages = pages.length;
  const currentBrands = pages[pageIndex] ?? [];

  if (brands.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <h2 className="mb-4 text-center text-lg font-bold text-zinc-900 sm:text-xl">{title}</h2>

      <div className="grid grid-cols-2 gap-px border border-zinc-200 bg-zinc-200 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {currentBrands.map((brand) => (
          <Link
            key={brand.name}
            href={`/products?brand=${encodeURIComponent(brand.name)}`}
            className="flex min-h-[40px] items-center justify-center bg-white px-2 py-2.5 text-center text-xs font-bold uppercase leading-tight tracking-wide text-zinc-800 transition-colors hover:text-accent hover:ring-1 hover:ring-inset hover:ring-accent sm:min-h-[44px] sm:py-3 sm:text-sm"
          >
            {brand.name.replace(/\(.*?\)/g, "").trim()}
          </Link>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Partner brand pages">
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === pageIndex}
              aria-label={`Page ${index + 1}`}
              onClick={() => setPageIndex(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === pageIndex ? "bg-accent" : "bg-zinc-300 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}