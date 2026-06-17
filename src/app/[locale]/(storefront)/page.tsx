import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/store/product-card";
import { getProducts } from "@/lib/supabase/products";

export default async function HomePage() {
  const [t, { products }] = await Promise.all([
    getTranslations("home"),
    getProducts(),
  ]);

  const featuredProducts = products.filter((p) => p.is_featured);
  const featured = (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 4);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-rose-100/40">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-rose-300/20 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-widest text-rose-500">{t("eyebrow")}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
              {t("title")}
              <span className="block text-rose-600">{t("titleLine2")}</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-zinc-600 sm:text-lg">{t("description")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex items-center rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
              >
                {t("viewProducts")}
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition-colors hover:bg-rose-50"
              >
                {t("viewCategories")}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-sm">
            {[
              { label: "🧴", text: "Skincare" },
              { label: "💄", text: "Makeup" },
              { label: "🎭", text: "Mask Pack" },
              { label: "☀️", text: "Suncare" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
              >
                <span className="text-3xl">{item.label}</span>
                <span className="mt-2 text-xs font-semibold text-zinc-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{t("featuredTitle")}</h2>
            <p className="mt-2 text-zinc-600">{t("featuredSubtitle", { count: featured.length })}</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-rose-600 hover:underline">
            {t("viewAll")}
          </Link>
        </div>

        {featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-100 bg-white p-10 text-center">
            <p className="text-zinc-600">{t("supabaseWarning")}</p>
            <Link href="/products" className="mt-4 inline-flex text-sm font-semibold text-rose-600 hover:underline">
              {t("viewProducts")}
            </Link>
          </div>
        )}

        <section className="mt-16 rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-xl font-bold sm:text-2xl">{t("b2bTitle")}</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-rose-100 sm:text-base">{t("b2bDescription")}</p>
          <div className="mt-6 grid gap-2 text-sm text-rose-100">
            <p>{t("b2cTitle")}: {t("b2cDescription")}</p>
            <p>{t("exportTitle")}: {t("exportDescription")}</p>
          </div>
        </section>
      </main>
    </>
  );
}
