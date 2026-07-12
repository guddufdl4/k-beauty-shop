import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { AddToCartForm } from "@/components/store/add-to-cart-form";
import { ProductImagePlaceholder } from "@/components/store/product-image-placeholder";
import {
  isCategoryPlaceholderUrl,
  resolveProductImageUrl,
} from "@/lib/product-images";
import { isProductSoldOut } from "@/lib/store/products-url";
import { getLocalizedCategoryName } from "@/lib/store/localized-category";
import { getUsdKrwRate } from "@/lib/currency";
import { formatLocalePrice, formatLocaleProductPrice } from "@/lib/utils";
import { getSiteSettings } from "@/lib/site-settings";
import { getProductBySlug } from "@/lib/supabase/products";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const [{ slug }, t, locale, siteSettings, usdKrwRate] = await Promise.all([
    params,
    getTranslations("products"),
    getLocale(),
    getSiteSettings(),
    getUsdKrwRate(),
  ]);
  const { product, meta } = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const primaryImage = product.images.find((img) => img.is_primary) ?? product.images[0];
  const displayImageUrl = resolveProductImageUrl(product);
  const isPlaceholder = isCategoryPlaceholderUrl(displayImageUrl);
  const inStock = !isProductSoldOut(product);
  const wholesaleLabel = siteSettings.wholesale_price_label || t("wholesalePrice");
  const moqLabel = siteSettings.moq_label || t("moq");

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 overflow-x-hidden px-4 py-10">
      {!meta.configured ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("supabaseWarning")}
        </p>
      ) : null}

      <nav className="mb-8 min-w-0 break-words text-sm text-zinc-500">
        <Link href="/products" className="hover:text-rose-600">
          {t("breadcrumbProducts")}
        </Link>
        {product.category ? (
          <>
            <span className="mx-2">/</span>
            <Link href={`/products?category=${product.category.slug}`} className="hover:text-rose-600">
              {getLocalizedCategoryName(product.category, locale)}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-zinc-800">{product.name}</span>
      </nav>

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="mx-auto w-full min-w-0 max-w-full lg:mx-0 lg:max-w-lg">
          {primaryImage ? (
            <div
              className={`relative aspect-square w-full max-w-full rounded-2xl bg-zinc-50 ring-1 ring-rose-100${isPlaceholder ? " bg-rose-50" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImageUrl}
                alt={primaryImage.alt_text ?? product.name}
                className={`absolute inset-0 h-full w-full object-contain${isPlaceholder ? " p-10" : ""}`}
              />
            </div>
          ) : (
            <ProductImagePlaceholder
              brand={product.brand}
              name={product.name}
              ariaLabel={t("imagePending", { brand: product.brand, name: product.name })}
            />
          )}
          {product.images.length > 1 && !isPlaceholder ? (
            <div className="mt-4 grid min-w-0 max-w-full grid-cols-4 gap-3">
              {product.images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square w-full min-w-0 max-w-full rounded-lg bg-zinc-50 ring-1 ring-rose-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt_text ?? product.name}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-hidden">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-500">{product.brand}</p>
          <h1 className="mt-2 text-balance break-words text-3xl font-bold tracking-tight text-zinc-900">
            {product.name}
          </h1>
          {product.short_description ? (
            <p className="mt-3 break-words text-lg text-zinc-600">{product.short_description}</p>
          ) : null}

          <div className="mt-8 min-w-0 space-y-4 rounded-2xl border border-rose-100 bg-white p-6">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t("retailPrice")}</p>
                <p className="text-2xl font-bold text-zinc-900">{formatLocaleProductPrice(product.price, locale, usdKrwRate)}</p>
                {product.compare_at_price ? (
                  <p className="text-sm text-zinc-400 line-through">{formatLocalePrice(product.compare_at_price, locale, usdKrwRate)}</p>
                ) : null}
              </div>
              {product.wholesale_price ? (
                <div className="min-w-0 text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{wholesaleLabel}</p>
                  <p className="text-xl font-bold text-rose-700">{formatLocaleProductPrice(product.wholesale_price, locale, usdKrwRate)}</p>
                </div>
              ) : null}
            </div>

            <dl className="grid min-w-0 grid-cols-2 gap-4 border-t border-rose-50 pt-4 text-sm">
              <div className="min-w-0">
                <dt className="text-zinc-500">{moqLabel}</dt>
                <dd className="font-semibold text-zinc-900">{t("moqUnit", { count: product.moq })}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-zinc-500">{t("stock")}</dt>
                <dd className={`font-semibold ${inStock ? "text-emerald-600" : "text-red-600"}`}>
                  {inStock ? t("inStock", { count: product.stock }) : t("outOfStock")}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-zinc-500">{t("sku")}</dt>
                <dd className="break-all font-mono text-zinc-800">{product.sku}</dd>
              </div>
              {product.short_description ? (
                <div className="min-w-0">
                  <dt className="text-zinc-500">{t("volume")}</dt>
                  <dd className="break-words font-semibold text-zinc-900">{product.short_description}</dd>
                </div>
              ) : null}
              {product.country_of_origin ? (
                <div className="min-w-0">
                  <dt className="text-zinc-500">{t("origin")}</dt>
                  <dd className="break-words font-semibold text-zinc-900">{product.country_of_origin}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <AddToCartForm
            productId={product.id}
            moq={product.moq}
            stock={product.stock}
            soldOut={product.sold_out}
          />

          {siteSettings.min_order_note ? (
            <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50/50 px-4 py-3 text-sm text-zinc-600">
              {siteSettings.min_order_note}
            </p>
          ) : null}

          {product.description ? (
            <section className="mt-10 min-w-0">
              <h2 className="text-lg font-semibold text-zinc-900">{t("description")}</h2>
              <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-zinc-600">{product.description}</p>
            </section>
          ) : null}

          {product.ingredients ? (
            <section className="mt-8 min-w-0">
              <h2 className="text-lg font-semibold text-zinc-900">{t("ingredients")}</h2>
              <p className="mt-3 break-words text-sm leading-relaxed text-zinc-600">{product.ingredients}</p>
            </section>
          ) : null}

          {product.how_to_use ? (
            <section className="mt-8 min-w-0">
              <h2 className="text-lg font-semibold text-zinc-900">{t("howToUse")}</h2>
              <p className="mt-3 break-words text-sm leading-relaxed text-zinc-600">{product.how_to_use}</p>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
