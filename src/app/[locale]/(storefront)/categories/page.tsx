import { getTranslations, getLocale } from "next-intl/server";
import { CategoryCard } from "@/components/store/category-card";
import { EmptyState } from "@/components/store/empty-state";
import { getCategories } from "@/lib/supabase/products";
import { localizeCategories } from "@/lib/store/localized-category";
import { Link } from "@/i18n/navigation";

export default async function CategoriesPage() {
  const [t, locale, { categories, meta }] = await Promise.all([
    getTranslations("categories"),
    getLocale(),
    getCategories(),
  ]);

  const localizedCategories = localizeCategories(categories, locale);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-10">
        <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
          {t("browse")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          {t("title")}
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
