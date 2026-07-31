"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { buildCategoryTree, findNavAncestorCategory, sortCategoriesForNav } from "@/lib/store/category-tree";
import { buildProductsHref, type ProductListSort } from "@/lib/store/products-url";
import { getLocalizedCategoryName } from "@/lib/store/localized-category";
import { isStorefrontNavSlug } from "@/lib/store/category-taxonomy";
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
  indent = 0,
  searchQuery,
  brandFilter,
  sort,
  locale,
}: {
  category: Category;
  isActive: boolean;
  indent?: number;
  searchQuery?: string;
  brandFilter?: string;
  sort?: ProductListSort;
  locale: string;
}) {
  const href = buildProductsHref({
    category: category.slug,
    q: searchQuery,
    brand: brandFilter,
    sort,
  });

  const paddingClass =
    indent === 0 ? "pl-0" : indent === 1 ? "pl-5" : "pl-8";

  const linkClassName = [
    "flex items-center gap-1.5 py-2 text-sm transition-colors",
    paddingClass,
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
        <span className="truncate">{getLocalizedCategoryName(category, locale)}</span>
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
  const { navCategories, childrenByParentId, hasHierarchy } = useMemo(
    () => buildCategoryTree(categories, locale),
    [categories, locale],
  );

  const activeCategory = activeCategorySlug
    ? categories.find((category) => category.slug === activeCategorySlug)
    : null;

  const activeParent = findNavAncestorCategory(categories, activeCategory, navCategories);

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
        {navCategories.map((category) => {
          const isParentActive = activeParent?.id === category.id;
          const isDirectActive = activeCategorySlug === category.slug;
          const rawSubcategories = hasHierarchy
            ? (childrenByParentId.get(category.id) ?? [])
            : [];
          const subcategories =
            isStorefrontNavSlug(category.slug)
              ? sortCategoriesForNav(category.slug, rawSubcategories, locale)
              : rawSubcategories;
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
                locale={locale}
              />
              {showSubcategories ? (
                <ul className="space-y-0.5">
                  {subcategories.map((subcategory) => {
                    const nested = childrenByParentId.get(subcategory.id) ?? [];
                    const isSubActive = activeCategorySlug === subcategory.slug;
                    const showNested =
                      nested.length > 0 &&
                      (isSubActive || nested.some((child) => child.slug === activeCategorySlug));

                    return (
                      <li key={subcategory.id}>
                        <CategoryLink
                          category={subcategory}
                          isActive={isSubActive}
                          indent={1}
                          searchQuery={searchQuery}
                          brandFilter={brandFilter}
                          sort={sort}
                          locale={locale}
                        />
                        {showNested ? (
                          <ul className="space-y-0.5">
                            {nested.map((child) => (
                              <CategoryLink
                                key={child.id}
                                category={child}
                                isActive={activeCategorySlug === child.slug}
                                indent={2}
                                searchQuery={searchQuery}
                                brandFilter={brandFilter}
                                sort={sort}
                                locale={locale}
                              />
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
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
  const locale = useLocale();
  const navCategories = useMemo(
    () => buildCategoryTree(categories, locale).navCategories,
    [categories, locale],
  );

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
            {navCategories.map((category) => {
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
                  {getLocalizedCategoryName(category, locale)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

