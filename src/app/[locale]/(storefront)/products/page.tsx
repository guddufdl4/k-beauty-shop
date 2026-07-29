import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState } from "@/components/store/empty-state";
import { ProductCatalogSidebar } from "@/components/store/products-sidebar-search";
import { ProductsPagination } from "@/components/store/products-pagination";
import { RelatedSearchTerms } from "@/components/store/related-search-terms";
import { parseProductListSort } from "@/lib/store/products-url";
import { getLocalizedCategoryName, localizeCategories } from "@/lib/store/localized-category";
import { getUsdKrwRate } from "@/lib/currency";
import {
  getCategories,
  getProducts,
  STOREFRONT_PRODUCTS_PAGE_SIZE,
} from "@/lib/supabase/products";

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    q?: string;
    page?: string;
    sort?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const [
    { category: categorySlug, brand: brandQuery, q: searchQuery, page: pageQuery, sort: sortQuery },
    t,
    locale,
    usdKrwRate,
  ] = await Promise.all([searchParams, getTranslations("products"), getLocale(), getUsdKrwRate()]);

  const searchTerm = searchQuery?.trim() || undefined;
  const brandFilter = brandQuery?.trim() || undefined;
  const sort = parseProductListSort(sortQuery);
  const currentPage = Math.max(1, Number.parseInt(pageQuery ?? "1", 10) || 1);

  const [{ products, totalCount, meta }, { categories }] = await Promise.all([
    getProducts({
      categorySlug,
      brand: brandFilter,
      brandExact: Boolean(brandFilter),
      search: searchTerm,
      sort,
      limit: STOREFRONT_PRODUCTS_PAGE_SIZE,
      page: currentPage,
      requireRealImage: true,
    }),
    getCategories(),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / STOREFRONT_PRODUCTS_PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const pageStart =
    totalCount === 0
      ? 0
      : (safePage - 1) * STOREFRONT_PRODUCTS_PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * STOREFRONT_PRODUCTS_PAGE_SIZE, totalCount);

  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : null;

  const listHrefOptions = { category: categorySlug, brand: brandFilter, q: searchTerm, sort };

  const pageTitle = brandFilter
    ? brandFilter
    : searchTerm
      ? `"${searchTerm}"`
      : activeCategory
        ? getLocalizedCategoryName(activeCategory, locale)
        : sort === "sale"
          ? t("sortSale")
          : sort === "trending"
            ? t("sortTrending")
            : sort === "latest"
              ? t("sortLatest")
              : t("allProducts");

  const localizedCategories = localizeCategories(categories, locale);
  const showSidebar = !brandFilter;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className={`flex flex-col gap-8 ${showSidebar ? "lg:flex-row lg:gap-10" : ""}`}>
        {showSidebar ? (
          <ProductCatalogSidebar
            categories={localizedCategories}
            activeCategorySlug={categorySlug}
            searchQuery={searchTerm}
            brandFilter={brandFilter}
            sort={sort}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="mb-6 border-b border-zinc-200 pb-4 sm:mb-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                {!brandFilter && !searchTerm && !activeCategory && sort ? (
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                    {t("catalog")}
                  </p>
                ) : brandFilter ? (
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent">
                    {t("brandCatalog")}
                  </p>
                ) : null}
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                  {pageTitle}
                </h1>
              </div>
              <p className="shrink-0 text-sm font-medium text-zinc-600 sm:text-base">
                {t("productCount", { count: totalCount })}
                {totalCount > 0 ? (
                  <span className="font-normal text-zinc-400">
                    {" "}
                    · {pageStart.toLocaleString(locale)}–
                    {pageEnd.toLocaleString(locale)}
                  </span>
                ) : null}
              </p>
            </div>

            {!meta.configured ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {t("sampleData")}
              </p>
            ) : null}
          </header>

          {searchTerm && totalCount <= 3 ? (
            <RelatedSearchTerms query={searchTerm} />
          ) : null}

          {products.length === 0 ? (
            <EmptyState
              title={t("emptyTitle")}
              description={meta.configured ? t("emptyConfigured") : t("emptyUnconfigured")}
            >
              {brandFilter ? (
                <Link
                  href="/brands"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {t("backToBrands")}
                </Link>
              ) : (
                <Link
                  href="/categories"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  {t("backToCategories")}
                </Link>
              )}
            </EmptyState>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} locale={locale} usdKrwRate={usdKrwRate} />
                ))}
              </div>

              {totalPages > 1 ? (
                <ProductsPagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  listHrefOptions={listHrefOptions}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
