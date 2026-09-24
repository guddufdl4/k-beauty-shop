import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState } from "@/components/store/empty-state";
import { ProductCatalogSidebar } from "@/components/store/products-sidebar-search";
import { ProductsPagination } from "@/components/store/products-pagination";
import { RelatedSearchTerms } from "@/components/store/related-search-terms";
import { CatalogSeoCopy } from "@/components/store/catalog-seo-copy";
import { CategoryLandingSeo } from "@/components/store/category-landing-seo";
import { JsonLd } from "@/components/store/json-ld";
import { getDisplayBrandName } from "@/lib/store/products-url";
import { getMoqBadgeKey, parseProductListSort } from "@/lib/store/products-url";
import { interleaveByBrand } from "@/lib/store/brand-diversity";
import { brandNameToSlug, buildBrandHref } from "@/lib/store/brand-url";
import { getLocalizedCategoryName, localizeCategories } from "@/lib/store/localized-category";
import { getUsdKrwRate } from "@/lib/currency";
import {
  getStorefrontCategories,
  getProducts,
  STOREFRONT_PRODUCTS_PAGE_SIZE,
} from "@/lib/supabase/products";
import { resolveStorefrontAudience } from "@/lib/store/product-visibility";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import {
  getCategorySeo,
  getProductsIndexSeo,
} from "@/lib/seo/catalog-copy";
import { NOINDEX_FOLLOW } from "@/lib/seo/constants";
import { buildProductsHref } from "@/lib/store/products-url";
import type { AppLocale } from "@/i18n/routing";

export const revalidate = 60;

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    q?: string;
    page?: string;
    sort?: string;
  }>;
};

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const { category, brand, q, page, sort } = await searchParams;
  const searchTerm = q?.trim();
  const brandFilter = brand?.trim();
  const categorySlug = category?.trim();
  const sortKey = parseProductListSort(sort);
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const indexSeo = getProductsIndexSeo(locale);

  if (searchTerm) {
    return buildStorefrontMetadata({
      locale,
      path: "/products",
      title: indexSeo.title,
      description: indexSeo.description,
      robots: NOINDEX_FOLLOW,
    });
  }

  if (brandFilter) {
    const brandSlug = brandNameToSlug(brandFilter);
    return buildStorefrontMetadata({
      locale,
      path: "/products",
      canonicalPath: brandSlug ? buildBrandHref(brandSlug) : "/products",
      title: `${getDisplayBrandName(brandFilter)} Wholesale`,
      description: indexSeo.description,
      robots: NOINDEX_FOLLOW,
    });
  }

  if (sortKey && !categorySlug) {
    return buildStorefrontMetadata({
      locale,
      path: "/products",
      title: indexSeo.title,
      description: indexSeo.description,
      robots: NOINDEX_FOLLOW,
    });
  }

  if (categorySlug) {
    const { categories } = await getStorefrontCategories();
    const activeCategory = categories.find((item) => item.slug === categorySlug);
    const fallbackName = activeCategory
      ? getLocalizedCategoryName(activeCategory, locale)
      : categorySlug;
    const categorySeo = getCategorySeo(categorySlug, locale, fallbackName);
    const canonicalPath = buildProductsHref({
      category: categorySlug,
      page: currentPage > 1 ? currentPage : undefined,
    });
    return buildStorefrontMetadata({
      locale,
      path: canonicalPath,
      title: categorySeo.title,
      description: categorySeo.description,
    });
  }

  const canonicalPath = buildProductsHref({
    page: currentPage > 1 ? currentPage : undefined,
  });
  return buildStorefrontMetadata({
    locale,
    path: canonicalPath,
    title: indexSeo.title,
    description: indexSeo.description,
  });
}

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
  const audience = await resolveStorefrontAudience();
  const isDefaultBrowse = !brandFilter && !searchTerm && !categorySlug && !sort;
  const queryLimit =
    isDefaultBrowse && currentPage === 1
      ? STOREFRONT_PRODUCTS_PAGE_SIZE * 20
      : STOREFRONT_PRODUCTS_PAGE_SIZE;
  const queryPage = isDefaultBrowse && currentPage === 1 ? 1 : currentPage;

  const [{ products: fetchedProducts, totalCount, meta }, { categories }] = await Promise.all([
    getProducts({
      categorySlug,
      brand: brandFilter,
      brandExact: Boolean(brandFilter),
      search: searchTerm,
      sort,
      limit: queryLimit,
      page: queryPage,
      requireRealImage: true,
      audience,
    }),
    getStorefrontCategories(),
  ]);

  const products =
    isDefaultBrowse && currentPage === 1
      ? interleaveByBrand(fetchedProducts, 2).slice(0, STOREFRONT_PRODUCTS_PAGE_SIZE)
      : fetchedProducts;

  const countAvailable = meta.countAvailable !== false;
  const totalPages = countAvailable
    ? Math.max(1, Math.ceil(totalCount / STOREFRONT_PRODUCTS_PAGE_SIZE))
    : Math.max(1, currentPage);
  const safePage = Math.min(currentPage, totalPages);
  const pageStart =
    products.length === 0
      ? 0
      : (safePage - 1) * STOREFRONT_PRODUCTS_PAGE_SIZE + 1;
  const pageEnd =
    products.length === 0 ? 0 : pageStart + products.length - 1;

  const activeCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : null;

  const listHrefOptions = { category: categorySlug, brand: brandFilter, q: searchTerm, sort };

  const categorySeo =
    !brandFilter && !searchTerm && categorySlug
      ? getCategorySeo(
          categorySlug,
          locale as AppLocale,
          activeCategory ? getLocalizedCategoryName(activeCategory, locale) : categorySlug,
        )
      : null;
  const indexSeo = getProductsIndexSeo(locale as AppLocale);

  const pageTitle = brandFilter
    ? getDisplayBrandName(brandFilter)
    : searchTerm
      ? `"${searchTerm}"`
      : categorySeo
        ? categorySeo.h1
        : sort === "sale"
          ? t("sortSale")
          : sort === "trending"
            ? t("sortTrending")
            : sort === "latest"
              ? t("sortLatest")
              : indexSeo.h1;

  const localizedCategories = localizeCategories(categories, locale);
  const showSidebar = !brandFilter;
  const relatedBrandLinks = categorySeo
    ? [...new Set(products.map((product) => product.brand).filter(Boolean))]
        .slice(0, 8)
        .map((brand) => ({
          href: buildBrandHref(brandNameToSlug(brand)),
          label: getDisplayBrandName(brand),
        }))
    : [];
  const categoryBodyParagraphs = categorySeo
    ? categorySeo.body.split("\n\n").map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
  const categoryIntro = categoryBodyParagraphs[0] ?? "";
  const categoryFollowUpParagraphs = categoryBodyParagraphs.slice(1);
  const showCategoryLandingSeo = Boolean(categorySeo && safePage === 1);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      {categorySeo && categorySlug ? (
        <JsonLd
          data={breadcrumbJsonLd(locale, [
            { name: "Home", path: "/" },
            { name: categorySeo.h1, path: buildProductsHref({ category: categorySlug }) },
          ])}
        />
      ) : null}
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
                {!searchTerm ? (
                  <Link
                    href="/brands"
                    className="mt-2 inline-flex text-sm font-medium text-accent hover:underline"
                  >
                    {t("chooseBrandFirst")}
                  </Link>
                ) : null}
              </div>
              {countAvailable ? (
                <p className="shrink-0 text-sm font-medium text-zinc-600 sm:text-base">
                  {t("productCount", { count: totalCount })}
                  {totalCount > 0 && products.length > 0 ? (
                    <span className="font-normal text-zinc-400">
                      {" "}
                      · {pageStart.toLocaleString(locale)}–
                      {pageEnd.toLocaleString(locale)}
                    </span>
                  ) : null}
                </p>
              ) : null}
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

          {showCategoryLandingSeo && categorySeo ? (
            <CategoryLandingSeo
              intro={categoryIntro}
              brandsLabel={t("brandsInCategory")}
              brands={relatedBrandLinks}
              needQuoteLabel={t("needCategoryQuote", { category: categorySeo.h1 })}
              requestQuoteLabel={t("requestQuote")}
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
                  <ProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                    usdKrwRate={usdKrwRate}
                    moqBadge={t(getMoqBadgeKey(product), { count: product.moq })}
                    signInToViewPriceLabel={t("signInToViewPrice")}
                  />
                ))}
              </div>

              {countAvailable && totalPages > 1 ? (
                <ProductsPagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  listHrefOptions={listHrefOptions}
                />
              ) : null}
            </>
          )}

          {showCategoryLandingSeo && categoryFollowUpParagraphs.length > 0 ? (
            <CatalogSeoCopy
              paragraphs={categoryFollowUpParagraphs}
              links={[
                { href: "/brands", label: t("chooseBrandFirst") },
                { href: "/products", label: t("allProducts") },
              ]}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
