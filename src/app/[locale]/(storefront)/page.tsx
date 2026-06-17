import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/store/product-card";
import { getProducts } from "@/lib/supabase/products";
import { Link } from "@/i18n/navigation";

export default async function HomePage() {
  const [t, { products, meta }] = await Promise.all([
    getTranslations("home"),
    getProducts(),
  ]);
  const featuredProducts = products.filter((p) => p.is_featured);
  const featured = (
    featuredProducts.length > 0 ? featuredProducts : products
  ).slice(0, 4);
  const highlights = [
    { label: t("b2bTitle"), description: t("b2bDescription"), emoji: "🏬" },
    { label: t("b2cTitle"), description: t("b2cDescription"), emoji: "🛍️" },
    { label: t("exportTitle"), description: t("exportDescription"), emoji: "🌏" },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-rose-100/40">
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
              {t("eyebrow")}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
              {t("title")}
              <span className="block text-rose-600">{t("titleLine2")}</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-zinc-600 sm:text-lg">
              {t("description")}
            </p>
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
          <div className="grid gap-3 sm:gap-4 lg:max-w-sm">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center justify-center rounded-2xl border border-rose-100 bg-white/80 p-5 text-center shadow-sm backdrop-blur-sm"
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="mt-2 text-xs font-semibold text-zinc-700">
                  {item.label}
                </span>
                <span className="mt-1 text-xs text-zinc-500">
                  {item.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
              {t("eyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {t("featuredTitle")}
            </h2>
            <p className="mt-2 text-zinc-600">
              {t("featuredSubtitle", { count: featured.length })}
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-rose-600 hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>
        {!meta.configured ? (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("supabaseWarning")}
          </p>
        ) : null}

        {featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-100 bg-white p-10 text-center">
            <p className="text-zinc-600">{t("featuredTitle")}</p>
            <Link
              href="/products"
              className="mt-4 inline-flex text-sm font-semibold text-rose-600 hover:underline"
            >
              {t("viewProducts")}
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
