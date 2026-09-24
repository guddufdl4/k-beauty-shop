import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { isRedundantProductDescription } from "@/lib/store/product-copy";
import {
  getLocalizedProductDescription,
  getLocalizedProductName,
  extractProductVolume,
  storefrontTextForLocale,
  localizeStorefrontProducts,
} from "@/lib/store/localized-product-name";
import { getStorefrontBarcode } from "@/lib/store/hangul-product-english";
import { AddToCartForm } from "@/components/store/add-to-cart-form";
import { JsonLd } from "@/components/store/json-ld";
import { ProductAdminDetailPanel } from "@/components/store/product-admin-detail-panel";
import { ProductCard } from "@/components/store/product-card";
import { ProductImagePlaceholder } from "@/components/store/product-image-placeholder";
import {
  isCategoryPlaceholderUrl,
  resolveProductImageUrl,
} from "@/lib/product-images";
import {
  getProductPriceColumns,
  getMoqBadgeKey,
  usesBoxQuantityField,
} from "@/lib/store/products-url";
import { getDisplayBrandName } from "@/lib/store/products-url";
import { brandNameToSlug, buildBrandHref } from "@/lib/store/brand-url";
import { getLocalizedCategoryName } from "@/lib/store/localized-category";
import { getUsdKrwRate } from "@/lib/currency";
import { formatLocaleProductPrice } from "@/lib/utils";
import { getSiteSettings } from "@/lib/site-settings";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { getCategories, getProductBySlug, getProducts } from "@/lib/supabase/products";
import {
  canViewProductPrices,
  isPricedStorefrontProduct,
  resolveStorefrontAudience,
} from "@/lib/store/product-visibility";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/json-ld";
import { getProductSeo, productImageAlt } from "@/lib/seo/catalog-copy";
import { buildProductsHref } from "@/lib/store/products-url";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [locale, audience] = await Promise.all([getLocale(), resolveStorefrontAudience()]);
  const { product } = await getProductBySlug(slug, audience);
  if (!product) {
    return {};
  }

  const imageUrl = resolveProductImageUrl(product);
  const displayName = getLocalizedProductName(product, locale);
  const brandName = getDisplayBrandName(product.brand);
  const localizedDescription = getLocalizedProductDescription(product, locale);
  const catalogDescription =
    !localizedDescription ||
    isRedundantProductDescription(localizedDescription, displayName, product.brand) ||
    isRedundantProductDescription(localizedDescription, product.name, product.brand)
      ? null
      : localizedDescription;
  const seo = getProductSeo({
    name: displayName,
    brand: brandName,
    categoryName: product.category ? getLocalizedCategoryName(product.category, locale) : null,
    volume:
      extractProductVolume(product) ??
      storefrontTextForLocale(product.short_description, locale),
    sku: product.sku,
    moq: product.moq,
    origin: storefrontTextForLocale(product.country_of_origin, locale),
    metaTitle: storefrontTextForLocale(product.meta_title, locale),
    metaDescription: storefrontTextForLocale(product.meta_description, locale),
    catalogDescription,
  });

  return buildStorefrontMetadata({
    locale,
    path: `/products/${product.slug}`,
    title: seo.title,
    description: seo.description,
    ogImage: isCategoryPlaceholderUrl(imageUrl) ? null : imageUrl,
  });
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const audience = await resolveStorefrontAudience();
  const [{ slug }, t, locale, siteSettings, usdKrwRate, session] = await Promise.all([
    params,
    getTranslations("products"),
    getLocale(),
    getSiteSettings(),
    getUsdKrwRate(),
    getSessionProfile(),
  ]);
  const { product, meta } = await getProductBySlug(slug, audience);
  const isAdmin = session.profile?.role === "admin";
  const canViewPrices = canViewProductPrices(audience);

  if (!product) {
    notFound();
  }

  const categoriesResult =
    isAdmin && isPricedStorefrontProduct(product) ? await getCategories() : null;

  const primaryImage = product.images.find((img) => img.is_primary) ?? product.images[0];
  const displayImageUrl = resolveProductImageUrl(product);
  const isPlaceholder = isCategoryPlaceholderUrl(displayImageUrl);
  const wholesaleLabel = siteSettings.wholesale_price_label || t("wholesalePrice");
  const moqLabel = siteSettings.moq_label || t("moq");
  const priceColumns = isPricedStorefrontProduct(product)
    ? getProductPriceColumns(product)
    : null;
  const quantityLabel = usesBoxQuantityField(product) ? t("unitsPerBox") : moqLabel;
  const quantityValue = usesBoxQuantityField(product)
    ? t("unitsPerBoxValue", { count: product.moq })
    : t("moqUnit", { count: product.moq });
  const displayName = getLocalizedProductName(product, locale);
  const localizedDescription = getLocalizedProductDescription(product, locale);
  const origin = storefrontTextForLocale(product.country_of_origin, locale);
  const ingredients = storefrontTextForLocale(product.ingredients, locale);
  const howToUse = storefrontTextForLocale(product.how_to_use, locale);
  const minOrderNote = storefrontTextForLocale(siteSettings.min_order_note, locale);
  const brandName = getDisplayBrandName(product.brand);
  const brandHref = buildBrandHref(brandNameToSlug(product.brand));
  const categoryName = product.category ? getLocalizedCategoryName(product.category, locale) : null;
  const volume =
    extractProductVolume(product) ?? storefrontTextForLocale(product.short_description, locale);
  const barcode = getStorefrontBarcode(product);
  const sku = product.sku?.trim() || null;
  const showSku = Boolean(sku && sku !== barcode);
  const catalogDescription =
    !localizedDescription ||
    isRedundantProductDescription(localizedDescription, displayName, product.brand) ||
    isRedundantProductDescription(localizedDescription, product.name, product.brand)
      ? null
      : localizedDescription;
  const productSeo = getProductSeo({
    name: displayName,
    brand: brandName,
    categoryName,
    volume,
    sku: product.sku,
    moq: product.moq,
    origin,
    metaTitle: storefrontTextForLocale(product.meta_title, locale),
    metaDescription: storefrontTextForLocale(product.meta_description, locale),
    catalogDescription,
  });
  const relatedResult = product.brand
    ? await getProducts({
        brand: product.brand,
        brandExact: true,
        limit: 8,
        requireRealImage: true,
        audience,
      })
    : { products: [] };
  const relatedProducts = localizeStorefrontProducts(
    relatedResult.products.filter((item) => item.slug !== product.slug).slice(0, 4),
    locale,
  );
  const breadcrumbHome = locale === "ko" ? "홈" : locale === "ja" ? "ホーム" : locale === "zh" ? "首页" : "Home";

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 overflow-x-hidden px-4 py-10">
      <JsonLd
        data={productJsonLd({
          locale,
          name: displayName,
          brand: brandName,
          description: productSeo.description,
          slug: product.slug,
          sku: product.sku,
          image: isPlaceholder ? null : displayImageUrl,
          categoryName,
          origin,
          volume,
          moq: product.moq,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: breadcrumbHome, path: "/" },
          ...(product.category
            ? [
                {
                  name: getLocalizedCategoryName(product.category, locale),
                  path: buildProductsHref({ category: product.category.slug }),
                },
              ]
            : []),
          ...(product.brand
            ? [{ name: brandName, path: brandHref }]
            : []),
          { name: displayName, path: `/products/${product.slug}` },
        ])}
      />
      {!meta.configured ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("supabaseWarning")}
        </p>
      ) : null}

      <nav className="mb-8 min-w-0 break-words text-sm text-zinc-500">
        <Link href="/" className="hover:text-rose-600">
          {breadcrumbHome}
        </Link>
        {product.category ? (
          <>
            <span className="mx-2">/</span>
            <Link href={buildProductsHref({ category: product.category.slug })} className="hover:text-rose-600">
              {getLocalizedCategoryName(product.category, locale)}
            </Link>
          </>
        ) : (
          <>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-rose-600">
              {t("breadcrumbProducts")}
            </Link>
          </>
        )}
        {product.brand ? (
          <>
            <span className="mx-2">/</span>
            <Link href={brandHref} className="hover:text-rose-600">
              {brandName}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-zinc-800">{displayName}</span>
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
                alt={
                  storefrontTextForLocale(primaryImage.alt_text, locale) ||
                  productImageAlt(brandName, displayName)
                }
                width={800}
                height={800}
                className={`absolute inset-0 h-full w-full object-contain${isPlaceholder ? " p-10" : ""}`}
              />
            </div>
          ) : (
            <ProductImagePlaceholder
              brand={product.brand}
              name={displayName}
              ariaLabel={t("imagePending", { brand: product.brand, name: displayName })}
            />
          )}
          {product.images.length > 1 && !isPlaceholder ? (
            <div className="mt-4 grid min-w-0 max-w-full grid-cols-4 gap-3">
              {product.images.map((img, index) => (
                <div
                  key={img.id}
                  className="relative aspect-square w-full min-w-0 max-w-full rounded-lg bg-zinc-50 ring-1 ring-rose-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={
                      storefrontTextForLocale(img.alt_text, locale) ||
                      productImageAlt(brandName, displayName, index)
                    }
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-hidden">
          {isAdmin && categoriesResult && isPricedStorefrontProduct(product) ? (
            <ProductAdminDetailPanel
              product={product}
              categories={categoriesResult.categories}
              locale={locale}
              wholesaleLabel={wholesaleLabel}
              moqLabel={moqLabel}
              usdKrwRate={usdKrwRate}
              minOrderNote={siteSettings.min_order_note}
            />
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-widest text-rose-500">
                <Link href={brandHref} className="hover:underline">
                  {brandName}
                </Link>
              </p>
              <h1 className="mt-2 text-balance break-words text-3xl font-bold tracking-tight text-zinc-900">
                {displayName}
              </h1>
              {product.short_description ? (
                <p className="mt-3 break-words text-lg text-zinc-600">{product.short_description}</p>
              ) : null}

              <div className="mt-8 min-w-0 space-y-4 rounded-2xl border border-rose-100 bg-white p-6">
                {canViewPrices && priceColumns ? (
                  <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        {t(priceColumns.primary.labelKey)}
                      </p>
                      <p className="text-2xl font-bold text-zinc-900">
                        {formatLocaleProductPrice(priceColumns.primary.amount, locale, usdKrwRate)}
                      </p>
                    </div>
                    {priceColumns.secondary ? (
                      <div className="min-w-0 text-right">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                          {t(priceColumns.secondary.labelKey)}
                        </p>
                        <p className="text-xl font-bold text-rose-700">
                          {formatLocaleProductPrice(priceColumns.secondary.amount, locale, usdKrwRate)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5">
                    <p className="text-lg font-semibold text-zinc-800">{t("signInToViewPrice")}</p>
                    <p className="mt-1 text-sm text-zinc-600">{t("signInToViewPriceHint")}</p>
                    <p className="mt-2 text-sm text-zinc-600">{t("signInToAddToCart")}</p>
                    <Link
                      href="/login"
                      className="mt-4 inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                    >
                      {t("signInToViewPriceAction")}
                    </Link>
                  </div>
                )}

                <dl className="grid min-w-0 grid-cols-2 gap-4 border-t border-rose-50 pt-4 text-sm">
                  <div className="min-w-0">
                    <dt className="text-zinc-500">{quantityLabel}</dt>
                    <dd className="font-semibold text-zinc-900">{quantityValue}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-zinc-500">{t("stock")}</dt>
                    <dd className={`font-semibold ${product.sold_out ? "text-red-600" : "text-emerald-600"}`}>
                      {canViewPrices && isPricedStorefrontProduct(product) ? (
                        product.sold_out ? (
                          t("outOfStock")
                        ) : product.stock > 0 ? (
                          t("inStock", { count: product.stock })
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )
                      ) : product.sold_out ? (
                        t("outOfStock")
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </dd>
                  </div>
                  {showSku ? (
                    <div className="min-w-0">
                      <dt className="text-zinc-500">{t("sku")}</dt>
                      <dd className="break-all font-mono text-zinc-800">{sku}</dd>
                    </div>
                  ) : null}
                  {barcode ? (
                    <div className="min-w-0">
                      <dt className="text-zinc-500">{t("barcode")}</dt>
                      <dd className="break-all font-mono text-zinc-800">{barcode}</dd>
                    </div>
                  ) : null}
                  {product.short_description ? (
                    <div className="min-w-0">
                      <dt className="text-zinc-500">{t("volume")}</dt>
                      <dd className="break-words font-semibold text-zinc-900">{product.short_description}</dd>
                    </div>
                  ) : null}
                  {origin ? (
                    <div className="min-w-0">
                      <dt className="text-zinc-500">{t("origin")}</dt>
                      <dd className="break-words font-semibold text-zinc-900">{origin}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {canViewPrices && isPricedStorefrontProduct(product) ? (
                <AddToCartForm
                  productId={product.id}
                  moq={product.moq}
                  stock={product.stock}
                  soldOut={product.sold_out}
                />
              ) : null}

              {minOrderNote ? (
                <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50/50 px-4 py-3 text-sm text-zinc-600">
                  {minOrderNote}
                </p>
              ) : null}

              <section className="mt-10 min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900">{t("description")}</h2>
                <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-zinc-600">
                  {!localizedDescription ||
                  isRedundantProductDescription(localizedDescription, displayName, product.brand) ||
                  isRedundantProductDescription(localizedDescription, product.name, product.brand)
                    ? t("descriptionFallback")
                    : localizedDescription}
                </p>
              </section>

              {ingredients ? (
                <section className="mt-8 min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-900">{t("ingredients")}</h2>
                  <p className="mt-3 break-words text-sm leading-relaxed text-zinc-600">{ingredients}</p>
                </section>
              ) : null}

              {howToUse ? (
                <section className="mt-8 min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-900">{t("howToUse")}</h2>
                  <p className="mt-3 break-words text-sm leading-relaxed text-zinc-600">{howToUse}</p>
                </section>
              ) : null}
            </>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="mt-14 border-t border-zinc-100 pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">{brandName}</h2>
            <Link href={brandHref} className="text-sm font-medium text-accent hover:underline">
              {brandName}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                locale={locale}
                usdKrwRate={usdKrwRate}
                moqBadge={t(getMoqBadgeKey(item), { count: item.moq })}
                signInToViewPriceLabel={t("signInToViewPrice")}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
