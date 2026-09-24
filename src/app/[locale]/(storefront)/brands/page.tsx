import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { OrderBrandCard } from "@/components/store/order-brand-card";
import { BrandsDirectory } from "@/components/store/products-sidebar-search";
import { getBrandDirectoryItems, getOrderBrandGroups } from "@/lib/supabase/brand-hub";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { getBrandsIndexSeo } from "@/lib/seo/catalog-copy";
import type { AppLocale } from "@/i18n/routing";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const seo = getBrandsIndexSeo(locale);
  return buildStorefrontMetadata({
    locale,
    path: "/brands",
    title: seo.title,
    description: seo.description,
  });
}

export default async function BrandsPage() {
  const [t, locale, directory] = await Promise.all([
    getTranslations("brands"),
    getLocale(),
    getBrandDirectoryItems(),
  ]);
  const { items, meta } = directory;
  const { top, newest } = await getOrderBrandGroups(items);
  const indexSeo = getBrandsIndexSeo(locale as AppLocale);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            {t("orderNowEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
            {indexSeo.h1}
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600">{t("orderNowDescription")}</p>
        </div>
        <Link
          href="/products"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-zinc-800 hover:border-accent hover:text-accent"
        >
          {t("allProductsCta")}
        </Link>
      </div>

      {!meta.configured ? (
        <p className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("supabaseWarning")}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-zinc-600">
          {t("empty")}
        </p>
      ) : (
        <div className="space-y-12">
          {top.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-zinc-900">{t("topBrands")}</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {top.map((brand) => (
                  <li key={brand.slug}>
                    <OrderBrandCard
                      brand={brand}
                      viewBrandLabel={t("viewBrandLink", { brand: brand.displayName })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {newest.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-zinc-900">{t("newBrands")}</h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {newest.map((brand) => (
                  <li key={brand.slug}>
                    <OrderBrandCard
                      brand={brand}
                      viewBrandLabel={t("viewBrandLink", { brand: brand.displayName })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h2 className="text-lg font-bold text-zinc-900">{t("allBrands")}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t("allBrandsHint")}</p>
            <div className="mt-4">
              <BrandsDirectory brands={items} />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
