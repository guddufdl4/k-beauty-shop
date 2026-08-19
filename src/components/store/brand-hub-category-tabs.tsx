"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildBrandHubHref } from "@/lib/store/brand-url";
import { cn } from "@/lib/utils";

export type BrandHubCategoryTabItem = {
  slug: string;
  label: string;
  count: number;
};

type Props = {
  brandSlug: string;
  tabs: BrandHubCategoryTabItem[];
  activeCategorySlug?: string;
  totalProductCount: number;
};

export function BrandHubCategoryTabs({
  brandSlug,
  tabs,
  activeCategorySlug,
  totalProductCount,
}: Props) {
  const t = useTranslations("brands");

  return (
    <nav aria-label={t("categoryTabsLabel")} className="border-b border-zinc-200">
      <div className="flex gap-2 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href={buildBrandHubHref(brandSlug)}
          aria-current={activeCategorySlug ? undefined : "page"}
          className={cn(
            "shrink-0 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition",
            activeCategorySlug
              ? "border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 hover:text-rose-700"
              : "border-zinc-200 bg-white text-rose-700",
          )}
        >
          {t("allCategories")}
          <span className="ml-1.5 text-xs font-normal text-zinc-400">
            {t("categoryProductCount", { count: totalProductCount })}
          </span>
        </Link>

        {tabs.map((tab) => {
          const isActive = activeCategorySlug === tab.slug;

          return (
            <Link
              key={tab.slug}
              href={buildBrandHubHref(brandSlug, { category: tab.slug })}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-t-lg border border-b-0 px-4 py-2.5 text-sm font-medium transition",
                isActive
                  ? "border-zinc-200 bg-white text-rose-700"
                  : "border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-zinc-50 hover:text-rose-700",
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs font-normal text-zinc-400">
                {t("categoryProductCount", { count: tab.count })}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
