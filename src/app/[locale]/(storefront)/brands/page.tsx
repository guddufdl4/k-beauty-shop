import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildProductsHref } from "@/lib/store/products-url";
import { getProductBrands } from "@/lib/supabase/products";

export default async function BrandsPage() {
  const [t, { brands, meta }] = await Promise.all([
    getTranslations("brands"),
    getProductBrands(),
  ]);

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
        ) : null}
      </div>

      {brands.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-zinc-600">
          {t("empty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {brands.map((brand) => (
            <Link
              key={brand}
              href={buildProductsHref({ brand })}
              className="flex h-20 items-center justify-center border border-zinc-200 bg-white px-4 text-center text-sm font-bold uppercase tracking-wide text-zinc-600 transition-colors hover:border-accent hover:text-accent"
            >
              {brand}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}