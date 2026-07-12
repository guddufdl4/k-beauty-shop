"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/store/product-card";
import type { ProductWithRelations } from "@/lib/supabase/products";

type TabKey = "bestSellers" | "mostViewed" | "newArrivals" | "allProducts";

type SectionConfig = {
  id: string;
  primaryTab: TabKey;
  secondaryTab: TabKey;
  products: Record<TabKey, ProductWithRelations[]>;
  labels: Record<TabKey, string>;
  viewAllLabel: string;
};

type Props = {
  sections: SectionConfig[];
  emptyMessage: string;
  badgeLabels: { hot: string; new: string };
  locale: string;
  usdKrwRate: number;
};

function ProductGrid({
  products,
  badgeLabels,
  locale,
  usdKrwRate,
}: {
  products: ProductWithRelations[];
  badgeLabels: { hot: string; new: string };
  locale: string;
  usdKrwRate: number;
}) {
  if (products.length === 0) {
    return null;
  }

  const newestIds = new Set(
    [...products]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 4)
      .map((product) => product.id),
  );

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          compact
          locale={locale}
          usdKrwRate={usdKrwRate}
          badge={
            product.is_featured
              ? { type: "hot", label: badgeLabels.hot }
              : newestIds.has(product.id)
                ? { type: "new", label: badgeLabels.new }
                : undefined
          }
        />
      ))}
    </div>
  );
}

function TabbedSection({
  section,
  badgeLabels,
  emptyMessage,
  locale,
  usdKrwRate,
}: {
  section: SectionConfig;
  badgeLabels: { hot: string; new: string };
  emptyMessage: string;
  locale: string;
  usdKrwRate: number;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(section.primaryTab);
  const products = section.products[activeTab] ?? [];
  const tabs: TabKey[] = [section.primaryTab, section.secondaryTab];

  return (
    <section className="border-b border-zinc-200 pb-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200">
        <div className="flex flex-wrap gap-4 sm:gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative min-h-11 pb-3 text-xs font-bold uppercase tracking-wide transition-colors sm:text-sm ${
                activeTab === tab
                  ? "text-accent after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-accent"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {section.labels[tab]}
            </button>
          ))}
        </div>
        <Link href="/products" className="min-h-11 pb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-accent">
          {section.viewAllLabel}
        </Link>
      </div>

      {products.length > 0 ? (
        <ProductGrid
          products={products.slice(0, 8)}
          badgeLabels={badgeLabels}
          locale={locale}
          usdKrwRate={usdKrwRate}
        />
      ) : (
        <p className="py-8 text-center text-sm text-zinc-500">{emptyMessage}</p>
      )}
    </section>
  );
}

export function HomeProductTabs({ sections, emptyMessage, badgeLabels, locale, usdKrwRate }: Props) {
  return (
    <div className="space-y-12">
      {sections.map((section) => (
        <TabbedSection
          key={section.id}
          section={section}
          badgeLabels={badgeLabels}
          emptyMessage={emptyMessage}
          locale={locale}
          usdKrwRate={usdKrwRate}
        />
      ))}
    </div>
  );
}