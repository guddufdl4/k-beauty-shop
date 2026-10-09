"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { HomeCampaignProduct } from "./home-campaign-product";
import type { StorefrontProduct, TrendingCategorySlug } from "@/lib/supabase/products";

export type TrendingFilterKey = "all" | TrendingCategorySlug;

type TrendingProducts = Record<TrendingFilterKey, StorefrontProduct[]>;

type BadgeLabels = {
  featured: string;
  bestSeller: string;
  new: string;
  sale: string;
  soldOut: string;
};

type FilterLabels = Record<TrendingFilterKey, string>;

type Props = {
  title: string;
  viewAllLabel: string;
  emptyMessage: string;
  productsByFilter: TrendingProducts;
  filterLabels: FilterLabels;
  badgeLabels: BadgeLabels;
  locale: string;
  usdKrwRate: number;
  signInToViewPriceLabel: string;
};

const FILTER_ORDER: TrendingFilterKey[] = ["all", "skincare", "makeup", "haircare"];

export function HomeTrendingSection({
  title,
  viewAllLabel,
  emptyMessage,
  productsByFilter,
  filterLabels,
  locale,
  usdKrwRate,
  signInToViewPriceLabel,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<TrendingFilterKey>("all");
  const [mobileProductLimit, setMobileProductLimit] = useState<number | null>(null);
  const [campaignBrand, setCampaignBrand] = useState("Beauty of Joseon");
  useEffect(() => { const update = (event:Event) => setCampaignBrand((event as CustomEvent<string>).detail); window.addEventListener("hmt:campaign-brand",update); return () => window.removeEventListener("hmt:campaign-brand",update); }, []);
  const products = (productsByFilter[activeFilter] ?? []).filter(product => activeFilter !== "all" || product.brand?.toLowerCase() === campaignBrand.toLowerCase());

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const update = () => setMobileProductLimit(mediaQuery.matches ? 6 : null);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const visibleProducts =
    mobileProductLimit !== null ? products.slice(0, mobileProductLimit) : products;
  const viewAllHref =
    activeFilter === "all"
      ? "/products?sort=trending"
      : `/products?category=${activeFilter}&sort=trending`;

  return (
    <section aria-labelledby="home-trending-heading" className="home-campaign-products min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="home-trending-heading" className="text-xl font-bold text-zinc-900 sm:text-2xl">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="shrink-0 text-sm font-semibold text-accent-hover transition-colors hover:text-accent"
        >
          {viewAllLabel}
        </Link>
      </div>

      <div className="home-category-filters mb-6 flex flex-wrap gap-2 sm:mb-8" role="tablist" aria-label={title}>
        {FILTER_ORDER.map((filter) => (
          <button
            key={filter}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
            className={`min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
              activeFilter === filter
                ? "bg-accent text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
            }`}
          >
            {filterLabels[filter]}
          </button>
        ))}
      </div>

      {visibleProducts.length > 0 ? (
        <div className="store-product-grid grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => (
            <div key={product.id} className="h-full">
              <HomeCampaignProduct
                product={product}
                locale={locale}
                usdKrwRate={usdKrwRate}
                signInToViewPriceLabel={signInToViewPriceLabel}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </section>
  );
}
