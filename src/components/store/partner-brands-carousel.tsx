"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { buildProductsHref } from "@/lib/store/products-url";
import type { PartnerBrand } from "@/lib/store/partner-brands";

type Props = {
  title: string;
  brands: PartnerBrand[];
};

function getItemsPerPage(width: number): number {
  if (width >= 1024) {
    return 10;
  }
  if (width >= 640) {
    return 6;
  }
  return 4;
}

function chunkBrands(brands: PartnerBrand[], size: number): PartnerBrand[][] {
  if (size <= 0) {
    return [];
  }

  const pages: PartnerBrand[][] = [];
  for (let index = 0; index < brands.length; index += size) {
    pages.push(brands.slice(index, index + size));
  }
  return pages;
}

function BrandCell({ brand }: { brand: PartnerBrand }) {
  const displayName = brand.name.replace(/\(.*?\)/g, "").trim();

  return (
    <Link
      href={buildProductsHref({ brand: brand.name })}
      className="group flex h-14 min-w-0 items-center justify-center bg-white px-2 transition-colors hover:bg-zinc-50 sm:h-16 sm:px-3"
      title={brand.name}
    >
      {brand.logoUrl ? (
        <Image
          src={brand.logoUrl}
          alt={brand.name}
          width={120}
          height={40}
          className="max-h-7 w-auto max-w-[88%] object-contain opacity-70 grayscale transition-opacity group-hover:opacity-100 sm:max-h-8"
          unoptimized
        />
      ) : (
        <span className="text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-zinc-500 transition-colors group-hover:text-zinc-700 sm:text-xs">
          {displayName}
        </span>
      )}
    </Link>
  );
}

export function PartnerBrandsCarousel({ title, brands }: Props) {
  const [activePage, setActivePage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(getItemsPerPage(window.innerWidth));
    };

    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const pages = useMemo(() => chunkBrands(brands, itemsPerPage), [brands, itemsPerPage]);

  useEffect(() => {
    setActivePage((current) => (pages.length === 0 ? 0 : Math.min(current, pages.length - 1)));
  }, [pages.length]);

  const goToPage = useCallback((index: number) => {
    setActivePage(index);
  }, []);

  if (brands.length === 0) {
    return null;
  }

  const showDots = pages.length > 1;
  const currentPage = pages[activePage] ?? pages[0] ?? [];

  return (
    <section className="mt-16 border-t border-zinc-200 pt-12">
      <h2 className="mb-8 text-center text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
        {title}
      </h2>

      {showDots ? (
        <div className="mb-4 flex items-center justify-center gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Partner brands page ${index + 1}`}
              aria-current={index === activePage ? "true" : undefined}
              onClick={() => goToPage(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === activePage ? "bg-accent" : "bg-zinc-300 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden border border-zinc-200 bg-white">
        <div
          className="grid divide-x divide-zinc-200 transition-opacity duration-300"
          style={{ gridTemplateColumns: `repeat(${Math.max(currentPage.length, 1)}, minmax(0, 1fr))` }}
        >
          {currentPage.map((brand) => (
            <BrandCell key={brand.name} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}