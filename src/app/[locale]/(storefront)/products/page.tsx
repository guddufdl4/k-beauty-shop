import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState } from "@/components/store/empty-state";
import { ProductCategoryFilter } from "@/components/store/product-category-filter";
import { buildProductsHref } from "@/lib/store/products-url";
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

  const localizedCategoryName = activeCategory
    ? getLocalizedCategoryName(activeCategory, locale)
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
            {brandFilter ? t("brandCatalog") : t("catalog")}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mt-2 text-zinc-600">
            {brandFilter
              ? t("productCountWithBrand", { count: totalCount, brand: brandFilter })
              : activeCategory && localizedCategoryName
                ? t("productCountWithCategory", {
                    count: totalCount,
                    category: localizedCategoryName,
                  })
                : t("productCount", { count: totalCount })}
            {totalCount > 0 ? (
              <span className="text-zinc-400">
                {" "}
                · {pageStart.toLocaleString(locale)}–
                {pageEnd.toLocaleString(locale)}
              </span>
            ) : null}
          </p>
        </div>
        {!meta.configured ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {t("sampleData")}
          </p>
        ) : null}
      </div>

      {!brandFilter ? (
        <ProductCategoryFilter
          categories={localizeCategories(categories, locale)}
          activeCategorySlug={categorySlug}
          searchQuery={searchTerm}
        />
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={meta.configured ? t("emptyConfigured") : t("emptyUnconfigured")}
        >
          {brandFilter ? (
            <Link
              href="/brands"
              className="text-sm font-medium text-rose-600 hover:underline"
            >
              {t("backToBrands")}
            </Link>
          ) : (
            <Link
              href="/categories"
              className="text-sm font-medium text-rose-600 hover:underline"
            >
              {t("backToCategories")}
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} usdKrwRate={usdKrwRate} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="mt-10 flex items-center justify-between gap-3 border-t border-zinc-100 pt-6">
              {safePage > 1 ? (
                <Link
                  href={buildProductsHref({ ...listHrefOptions, page: safePage - 1 })}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
                >
                  {t("prevPage")}
                </Link>
              ) : (
                <span className="text-sm text-zinc-300">{t("prevPage")}</span>
              )}
              <p className="text-sm text-zinc-500">
                {safePage} / {totalPages}
              </p>
              {safePage < totalPages ? (
                <Link
                  href={buildProductsHref({ ...listHrefOptions, page: safePage + 1 })}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
                >
                  {t("nextPage")}
                </Link>
              ) : (
                <span className="text-sm text-zinc-300">{t("nextPage")}</span>
              )}
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
