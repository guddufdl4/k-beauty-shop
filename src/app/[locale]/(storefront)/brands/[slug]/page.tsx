import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link, redirect } from "@/i18n/navigation";
import { BrandHubCategoryTabs } from "@/components/store/brand-hub-category-tabs";
import { BrandHubPagination } from "@/components/store/brand-hub-pagination";
import { EmptyState } from "@/components/store/empty-state";
import { ProductCard } from "@/components/store/product-card";
import { getUsdKrwRate } from "@/lib/currency";
import { getLocalizedCategoryName } from "@/lib/store/localized-category";
import { getMoqBadgeKey } from "@/lib/store/products-url";
import { resolveStorefrontAudience } from "@/lib/store/product-visibility";
import {
  buildBrandHref,
  buildBrandHubHref,
  parseBrandHubPageParam,
  resolveBrandHubPageOverflowTarget,
} from "@/lib/store/brand-url";
import {
  getBrandHubCategoryTabs,
  getBrandHubLogoUrl,
  isValidBrandCategorySlug,
  resolveBrandHubEntry,
} from "@/lib/supabase/brand-hub";
import {
  getProducts,
  getStorefrontCategories,
  STOREFRONT_PRODUCTS_PAGE_SIZE,
} from "@/lib/supabase/products";
import { routing, type AppLocale } from "@/i18n/routing";

type BrandHubPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; page?: string | string[] }>;
};

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "https://hmtkorea.com";
}

export async function generateMetadata({ params }: BrandHubPageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = await resolveBrandHubEntry(slug);
  if (!entry) {
    return {};
  }

  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations({ locale, namespace: "brands" });
  const siteUrl = resolveSiteUrl();
  const path = buildBrandHref(entry.slug);

  return {
    title: t("metaTitle", { brand: entry.displayName }),
    description: t("metaDescription", { brand: entry.displayName }),
    alternates: {
      canonical: `${siteUrl}/${locale}${path}`,
      languages: Object.fromEntries(
        routing.locales.map((entryLocale) => [entryLocale, `${siteUrl}/${entryLocale}${path}`]),
      ),
    },
  };
}

export default async function BrandHubPage({ params, searchParams }: BrandHubPageProps) {
  const [
    { slug },
    { category: categorySlug, page: pageQuery },
    t,
    tProducts,
    locale,
    usdKrwRate,
  ] = await Promise.all([
    params,
    searchParams,
    getTranslations("brands"),
    getTranslations("products"),
    getLocale(),
    getUsdKrwRate(),
  ]);

  const entry = await resolveBrandHubEntry(slug);
  if (!entry) {
    notFound();
  }

  const audience = await resolveStorefrontAudience();
  const categoryFilter = categorySlug?.trim() || undefined;
  const pageParam = parseBrandHubPageParam(pageQuery);

  const [{ categories }, logoUrl] = await Promise.all([
    getStorefrontCategories(),
    getBrandHubLogoUrl(entry.filterBrand, entry.displayName),
  ]);

  const { tabs } = await getBrandHubCategoryTabs(entry.filterBrand, categories);

  if (categoryFilter && !isValidBrandCategorySlug(categoryFilter, tabs)) {
    notFound();
  }

  const listQuery = {
    brand: entry.filterBrand,
    brandExact: true as const,
    categorySlug: categoryFilter,
    limit: STOREFRONT_PRODUCTS_PAGE_SIZE,
    page: pageParam.page,
    requireRealImage: true as const,
    audience,
  };

  const [{ products, totalCount, meta }, allProductsCountResult] = await Promise.all([
    getProducts(listQuery),
    categoryFilter
      ? getProducts({
          brand: entry.filterBrand,
          brandExact: true,
          limit: 1,
          page: 1,
          requireRealImage: true,
          audience,
        })
      : Promise.resolve(null),
  ]);

  const overflowTarget = resolveBrandHubPageOverflowTarget(
    pageParam.page,
    totalCount,
    STOREFRONT_PRODUCTS_PAGE_SIZE,
  );

  if (pageParam.shouldRedirect || overflowTarget !== null) {
    const targetPage = overflowTarget ?? pageParam.redirectPage;
    redirect({
      href: buildBrandHubHref(entry.slug, {
        category: categoryFilter,
        page: targetPage > 1 ? targetPage : undefined,
      }),
      locale,
    });
  }

  const currentPage = pageParam.page;
  const totalPages =
    totalCount === 0 ? 1 : Math.ceil(totalCount / STOREFRONT_PRODUCTS_PAGE_SIZE);
  const pageStart =
    totalCount === 0 ? 0 : (currentPage - 1) * STOREFRONT_PRODUCTS_PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * STOREFRONT_PRODUCTS_PAGE_SIZE, totalCount);
  const allProductCount = categoryFilter ? (allProductsCountResult?.totalCount ?? 0) : totalCount;

  const categoryTabs = tabs.map((tab) => {
    const category = categories.find((item) => item.slug === tab.slug);
    return {
      slug: tab.slug,
      label: category ? getLocalizedCategoryName(category, locale) : tab.name,
      count: tab.count,
    };
  });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label={t("breadcrumb")} className="mb-6 text-sm text-zinc-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-rose-600">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/brands" className="hover:text-rose-600">
              {t("breadcrumbBrands")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-medium text-zinc-800" aria-current="page">
            {entry.displayName}
          </li>
        </ol>
      </nav>

      <header className="mb-8 border-b border-zinc-200 pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex h-24 w-full max-w-[200px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-4 sm:h-28">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={entry.displayName}
                width={180}
                height={64}
                sizes="180px"
                className="h-12 w-auto max-w-full object-contain sm:h-14"
              />
            ) : (
              <span className="text-center text-sm font-bold uppercase leading-tight tracking-wide text-zinc-800 sm:text-base">
                {entry.displayName}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              {t("viewBrand")}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {entry.displayName}
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-600">
              {t("exploreProducts", { brand: entry.displayName })}
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-600">
              {t("productCount", { count: totalCount })}
              {totalCount > 0 ? (
                <span className="font-normal text-zinc-400">
                  {" "}
                  · {pageStart.toLocaleString(locale)}–{pageEnd.toLocaleString(locale)}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </header>

      {!meta.configured ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("supabaseWarning")}
        </p>
      ) : null}

      {allProductCount > 0 || categoryTabs.length > 0 ? (
        <BrandHubCategoryTabs
          brandSlug={entry.slug}
          tabs={categoryTabs}
          activeCategorySlug={categoryFilter}
          totalProductCount={allProductCount}
        />
      ) : null}

      <section className="mt-8">
        {products.length === 0 ? (
          <EmptyState title={t("noProducts")} description={t("exploreProducts", { brand: entry.displayName })}>
            <Link href="/brands" className="text-sm font-medium text-accent hover:underline">
              {tProducts("backToBrands")}
            </Link>
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
                  moqBadge={tProducts(getMoqBadgeKey(product), { count: product.moq })}
                  signInToViewPriceLabel={tProducts("signInToViewPrice")}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <BrandHubPagination
                brandSlug={entry.slug}
                categorySlug={categoryFilter}
                currentPage={currentPage}
                totalPages={totalPages}
              />
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
