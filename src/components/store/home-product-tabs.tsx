"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/store/product-card";
import { getMoqBadgeKey, isPricedStorefrontProduct, isProductOnSale, isProductSoldOut } from "@/lib/store/products-url";
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

const NEW_PRODUCT_DAYS = 45;

function isNewProduct(product: StorefrontProduct): boolean {
  const created = new Date(product.created_at);
  if (Number.isNaN(created.getTime())) {
    return false;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEW_PRODUCT_DAYS);
  return created >= cutoff;
}

function resolveProductBadge(
  product: StorefrontProduct,
  badgeLabels: BadgeLabels,
): { type: "featured" | "bestSeller" | "new" | "sale"; label: string } | undefined {
  if (isProductSoldOut(product)) {
    return undefined;
  }

  if (product.is_best_seller) {
    return { type: "bestSeller", label: badgeLabels.bestSeller };
  }

  if (product.is_featured) {
    return { type: "featured", label: badgeLabels.featured };
  }

  if (isNewProduct(product)) {
    return { type: "new", label: badgeLabels.new };
  }

  if (isPricedStorefrontProduct(product) && isProductOnSale(product)) {
    return { type: "sale", label: badgeLabels.sale };
  }

  return undefined;
}

export function HomeTrendingSection({
  title,
  viewAllLabel,
  emptyMessage,
  productsByFilter,
  filterLabels,
  badgeLabels,
  locale,
  usdKrwRate,
  signInToViewPriceLabel,
}: Props) {
  const tProducts = useTranslations("products");
  const [activeFilter, setActiveFilter] = useState<TrendingFilterKey>("all");
  const [mobileProductLimit, setMobileProductLimit] = useState<number | null>(null);
  const products = productsByFilter[activeFilter] ?? [];

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
    <section aria-labelledby="home-trending-heading" className="min-w-0">
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

      <div className="mb-6 flex flex-wrap gap-2 sm:mb-8" role="tablist" aria-label={title}>
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
        <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => (
            <div key={product.id} className="h-full">
              <ProductCard
                product={product}
                variant="trending"
                locale={locale}
                usdKrwRate={usdKrwRate}
                moqBadge={tProducts(getMoqBadgeKey(product), { count: product.moq })}
                badge={resolveProductBadge(product, badgeLabels)}
                soldOutLabel={badgeLabels.soldOut}
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
