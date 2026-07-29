"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { buildCategoryTree } from "@/lib/store/category-tree";
import { getCategorySortLocale } from "@/lib/store/localized-category";
import { buildProductsHref, type ProductListSort } from "@/lib/store/products-url";
import type { Category } from "@/lib/supabase/products";
type Props = {
  initialQuery?: string;
  categorySlug?: string;
  brandFilter?: string;
  sort?: ProductListSort;
};

export function ProductsSidebarSearch({
  initialQuery,
  categorySlug,
  brandFilter,
  sort,
}: Props) {
  const t = useTranslations("nav");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery ?? "");

  useEffect(() => {
    setQuery(initialQuery ?? "");
  }, [initialQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(
      buildProductsHref({
        q: trimmed || undefined,
        category: categorySlug,
        brand: brandFilter,
        sort,
      }),
    );
  }

  return (
    <form onSubmit={handleSubmit} role="search">
      <div className="flex overflow-hidden rounded-sm border border-zinc-200 bg-white focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-w-0 flex-1 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none"
          aria-label={t("searchPlaceholder")}
          autoComplete="off"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center px-3 text-zinc-500 transition-colors hover:text-accent"
          aria-label={t("searchButton")}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </form>
  );
}

type CatalogSidebarProps = {
  categories: Category[];
  activeCategorySlug?: string;
  searchQuery?: string;
  brandFilter?: string;
  sort?: ProductListSort;
};

function ActiveMarker() {
  return (
    <svg
      viewBox="0 0 8 10"
      className="h-2.5 w-2.5 shrink-0 fill-current text-accent"
      aria-hidden
    >
      <path d="M0 0v10l8-5L0 0z" />
    </svg>
  );
}

function CategoryLink({
  category,
  isActive,
  indent = false,
  searchQuery,
  brandFilter,
  sort,
}: {
  category: Category;
  isActive: boolean;
  indent?: boolean;
  searchQuery?: string;
  brandFilter?: string;
  sort?: ProductListSort;
}) {
  const href = buildProductsHref({
    category: category.slug,
    q: searchQuery,
    brand: brandFilter,
    sort,
  });

  const linkClassName = [
    "flex items-center gap-1.5 py-2 text-sm transition-colors",
    indent ? "pl-5" : "pl-0",
    isActive ? "font-semibold text-accent" : "text-zinc-700 hover:text-accent",
  ].join(" ");

  return (
    <li>
      <Link
        href={href}
        className={linkClassName}
        aria-current={isActive ? "page" : undefined}
      >
        {isActive ? <ActiveMarker /> : <span className="w-2.5 shrink-0" aria-hidden />}
        <span className="truncate">{category.name}</span>
      </Link>
    </li>
  );
}

function CategoryNavList({
  categories,
  activeCategorySlug,
  searchQuery,
  brandFilter,
  sort,
  className,
}: CatalogSidebarProps & { className?: string }) {
  const t = useTranslations("products");
  const locale = useLocale();
  const sortLocale = getCategorySortLocale(locale);

  const { topLevel, childrenByParentId, hasHierarchy } = useMemo(() => {
    const tree = buildCategoryTree(categories);
    return {
      ...tree,
      topLevel: [...tree.topLevel].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, sortLocale),
      ),
    };
  }, [categories, sortLocale]);

  const activeCategory = activeCategorySlug
    ? categories.find((category) => category.slug === activeCategorySlug)
    : null;

  const activeParent = activeCategory?.parent_id
    ? categories.find((category) => category.id === activeCategory.parent_id)
    : activeCategory;

  const isAllActive = !activeCategorySlug;

  const allLinkClassName = [
    "flex items-center gap-1.5 py-2 text-sm transition-colors",
    isAllActive ? "font-semibold text-accent" : "text-zinc-700 hover:text-accent",
  ].join(" ");

  return (
    <nav className={className} aria-label={t("categoryFilter")}>
      <ul className="space-y-0.5">
        <li>
          <Link
            href={buildProductsHref({ q: searchQuery, brand: brandFilter, sort })}
            className={allLinkClassName}
            aria-current={isAllActive ? "page" : undefined}
          >
            {isAllActive ? <ActiveMarker /> : <span className="w-2.5 shrink-0" aria-hidden />}
            <span>{t("all")}</span>
          </Link>
        </li>
        {topLevel.map((category) => {
          const isParentActive = activeParent?.id === category.id;
          const isDirectActive = activeCategorySlug === category.slug;
          const subcategories = hasHierarchy
            ? (childrenByParentId.get(category.id) ?? [])
            : [];
          const showSubcategories =
            hasHierarchy && subcategories.length > 0 && isParentActive;

          return (
            <li key={category.id}>
              <CategoryLink
                category={category}
                isActive={isDirectActive}
                searchQuery={searchQuery}
                brandFilter={brandFilter}
                sort={sort}
              />
              {showSubcategories ? (
                <ul className="space-y-0.5">
                  {subcategories.map((subcategory) => (
                    <CategoryLink
                      key={subcategory.id}
                      category={subcategory}
                      isActive={activeCategorySlug === subcategory.slug}
                      indent
                      searchQuery={searchQuery}
                      brandFilter={brandFilter}
                      sort={sort}
                    />
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function chipClassName(isActive: boolean): string {
  const base =
    "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors";
  return isActive
    ? `${base} border-accent bg-accent text-white`
    : `${base} border-zinc-200 bg-white text-zinc-700 hover:border-accent hover:text-accent`;
}

export function ProductCatalogSidebar({
  categories,
  activeCategorySlug,
  searchQuery,
  brandFilter,
  sort,
}: CatalogSidebarProps) {
  const t = useTranslations("products");
  const topLevelCategories = categories
    .filter((category) => !category.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
          {t("categoryFilter")}
        </p>
        <ProductsSidebarSearch
          initialQuery={searchQuery}
          categorySlug={activeCategorySlug}
          brandFilter={brandFilter}
          sort={sort}
        />
        <div className="mt-6 border-t border-zinc-200 pt-4">
          <CategoryNavList
            categories={categories}
            activeCategorySlug={activeCategorySlug}
            searchQuery={searchQuery}
            brandFilter={brandFilter}
            sort={sort}
          />
        </div>
      </aside>
      <div className="lg:hidden">
        <ProductsSidebarSearch
          initialQuery={searchQuery}
          categorySlug={activeCategorySlug}
          brandFilter={brandFilter}
          sort={sort}
        />
        <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full gap-2">
            <Link
              href={buildProductsHref({ q: searchQuery, brand: brandFilter, sort })}
              className={chipClassName(!activeCategorySlug)}
              aria-current={!activeCategorySlug ? "page" : undefined}
            >
              {t("all")}
            </Link>
            {topLevelCategories.map((category) => {
              const isActive = activeCategorySlug === category.slug;
              return (
                <Link
                  key={category.id}
                  href={buildProductsHref({
                    category: category.slug,
                    q: searchQuery,
                    brand: brandFilter,
                    sort,
                  })}
                  className={chipClassName(isActive)}
                  aria-current={isActive ? "page" : undefined}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

