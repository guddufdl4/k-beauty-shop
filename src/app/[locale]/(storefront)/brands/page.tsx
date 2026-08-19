import { getTranslations } from "next-intl/server";
import { BrandsDirectory } from "@/components/store/products-sidebar-search";
import { getBrandDirectoryItems } from "@/lib/supabase/brand-hub";

export default async function BrandsPage() {
  const [t, { items, meta }] = await Promise.all([
    getTranslations("brands"),
    getBrandDirectoryItems(),
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

      {items.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-zinc-600">
          {t("empty")}
        </p>
      ) : (
        <BrandsDirectory brands={items} />
      )}
    </main>
  );
}
