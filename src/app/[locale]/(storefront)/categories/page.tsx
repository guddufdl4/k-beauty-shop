import { getTranslations, getLocale } from "next-intl/server";
import { CategoryCard } from "@/components/store/category-card";
import { EmptyState } from "@/components/store/empty-state";
import { JsonLd } from "@/components/store/json-ld";
import { getStorefrontCategories } from "@/lib/supabase/products";
import { localizeCategories, pickStorefrontNavCategories } from "@/lib/store/localized-category";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { getCategoriesIndexSeo } from "@/lib/seo/catalog-copy";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import type { AppLocale } from "@/i18n/routing";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const seo = getCategoriesIndexSeo(locale);
  return buildStorefrontMetadata({
    locale,
    path: "/categories",
    title: seo.title,
    description: seo.description,
  });
}

export default async function CategoriesPage() {
  const [t, locale, { categories, meta }] = await Promise.all([
    getTranslations("categories"),
    getLocale(),
    getStorefrontCategories(),
  ]);

  const localizedCategories = localizeCategories(
    pickStorefrontNavCategories(categories),
    locale,
  );
  const seo = getCategoriesIndexSeo(locale as AppLocale);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: "Home", path: "/" },
          { name: seo.h1, path: "/categories" },
        ])}
      />
      <div className="mb-10">
        <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
          {t("browse")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          {seo.h1}
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-600">{t("description")}</p>
        {!meta.configured ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("supabaseWarning")}
          </p>
        ) : meta.source === "static" && !meta.error ? (
          <p className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {t("emptyDb")}
          </p>
        ) : null}
      </div>

      {localizedCategories.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {localizedCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link
          href="/products"
          className="inline-flex items-center rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          {t("viewAllProducts")}
        </Link>
      </div>
    </main>
  );
}
