import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { buildStorefrontMetadata } from "@/lib/seo/metadata";
import { isRedundantProductDescription } from "@/lib/store/product-copy";
import {
  getLocalizedProductDescription,
  getLocalizedProductName,
  getKoreanProductSubtitle,
  extractProductVolume,
  storefrontTextForLocale,
  localizeStorefrontProducts,
} from "@/lib/store/localized-product-name";
import { getStorefrontBarcode } from "@/lib/store/hangul-product-english";
import { AddToCartForm } from "@/components/store/add-to-cart-form";
import { CopyValueButton } from "@/components/store/copy-value-button";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductShareButton } from "@/components/store/product-share-button";
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
  usableShopPrice,
} from "@/lib/store/products-url";
import { getDisplayBrandName } from "@/lib/store/products-url";
import { brandNameToSlug, buildBrandHref } from "@/lib/store/brand-url";
import { getLocalizedCategoryName } from "@/lib/store/localized-category";
import { getUsdKrwRate } from "@/lib/currency";
import { formatKRW, formatLocaleProductPrice } from "@/lib/utils";
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
import { catalogTitleIncludesVolume, formatCatalogDate, formatOriginLabel } from "@/lib/store/origin-label";
import { withReturnTo } from "@/lib/auth/return-to";
import { isValidHmtProductCode } from "@/lib/supabase/product-code";

import { getPublicRetailPrice } from "@/lib/store/retail-price";

type ProductDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ qty?: string }>;
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

function InfoRow({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 border-b border-zinc-100 py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-zinc-900">
        <span className="break-all">{value}</span>
        {action ? <div className="mt-1 flex justify-end">{action}</div> : null}
      </dd>
    </div>
  );
}

export default async function ProductDetailPage({ params, searchParams }: ProductDetailPageProps) {
  const audience = await resolveStorefrontAudience();
  const [{ slug }, { qty }, t, locale, siteSettings, usdKrwRate, session] = await Promise.all([
    params,
    searchParams,
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

  const displayImageUrl = resolveProductImageUrl(product);
  const isPlaceholder = isCategoryPlaceholderUrl(displayImageUrl);
  const wholesaleLabel = siteSettings.wholesale_price_label || t("wholesalePrice");
  const moqLabel = siteSettings.moq_label || t("moq");
  const priceColumns = isPricedStorefrontProduct(product)
    ? getProductPriceColumns(product)
    : null;
  const retailAmount =
    canViewPrices && isPricedStorefrontProduct(product)
      ? usableShopPrice(product.compare_at_price)
      : meta.source === "database" ? await getPublicRetailPrice(product.id) : null;
  const displayName = getLocalizedProductName(product, locale);
  const koreanName = getKoreanProductSubtitle(product, displayName);
  const localizedDescription = getLocalizedProductDescription(product, locale);
  const origin = formatOriginLabel(storefrontTextForLocale(product.country_of_origin, locale));
  const ingredients = storefrontTextForLocale(product.ingredients, locale);
  const howToUse = storefrontTextForLocale(product.how_to_use, locale);
  const minOrderNote = storefrontTextForLocale(siteSettings.min_order_note, locale);
  const brandName = getDisplayBrandName(product.brand);
  const brandHref = buildBrandHref(brandNameToSlug(product.brand));
  const categoryName = product.category ? getLocalizedCategoryName(product.category, locale) : null;
  const volume =
    extractProductVolume(product) ?? storefrontTextForLocale(product.short_description, locale);
  const showVolumeLine = Boolean(volume && !catalogTitleIncludesVolume(displayName, volume));
  const barcode = getStorefrontBarcode(product);
  const productCode = isValidHmtProductCode(product.product_code ?? "") ? product.product_code : null;
  const catalogDescription =
    !localizedDescription ||
    isRedundantProductDescription(localizedDescription, displayName, product.brand) ||
    isRedundantProductDescription(localizedDescription, product.name, product.brand)
      ? null
      : localizedDescription;
  const lastUpdated = formatCatalogDate(product.updated_at);
  const defaultQty = Number.parseInt(qty ?? "", 10);
  const galleryImages = product.images
    .filter((image) => image.url && !isCategoryPlaceholderUrl(image.url))
    .map((image, index) => ({
      id: image.id,
      url: image.url,
      alt:
        storefrontTextForLocale(image.alt_text, locale) ||
        productImageAlt(brandName, displayName, index),
    }));
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
  const returnTo = `/products/${product.slug}${Number.isFinite(defaultQty) ? `?qty=${defaultQty}` : ""}`;
  const showMoq = product.moq > 0 && !usesBoxQuantityField(product);
  const showUnitsPerBox = product.moq > 0 && usesBoxQuantityField(product);

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
          ...(product.brand ? [{ name: brandName, path: brandHref }] : []),
          { name: displayName, path: `/products/${product.slug}` },
        ])}
      />
      {!meta.configured ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t("supabaseWarning")}
        </p>
      ) : null}

      <nav className="mb-8 min-w-0 break-words text-sm text-zinc-500">
        <Link href="/" className="hover:text-violet-700">
          {breadcrumbHome}
        </Link>
        {product.category ? (
          <>
            <span className="mx-2">/</span>
            <Link href={buildProductsHref({ category: product.category.slug })} className="hover:text-violet-700">
              {getLocalizedCategoryName(product.category, locale)}
            </Link>
          </>
        ) : (
          <>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-violet-700">
              {t("breadcrumbProducts")}
            </Link>
          </>
        )}
        {product.brand ? (
          <>
            <span className="mx-2">/</span>
            <Link href={brandHref} className="hover:text-violet-700">
              {brandName}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-zinc-800">{displayName}</span>
      </nav>

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-8 lg:grid-cols-2">
        {galleryImages.length > 0 ? (
          <ProductGallery
            images={galleryImages}
            fallbackUrl={isPlaceholder ? null : displayImageUrl}
            productName={displayName}
            expandLabel={t("expandImage")}
            closeLabel={t("closeImage")}
          />
        ) : (
          <ProductImagePlaceholder
            brand={product.brand}
            name={displayName}
            ariaLabel={t("imagePending", { brand: product.brand, name: displayName })}
          />
        )}

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
              <p className="text-sm font-semibold uppercase tracking-widest text-violet-700">
                <Link href={brandHref} className="hover:underline">
                  {brandName}
                </Link>
              </p>
              <h1 className="mt-2 text-balance break-words text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                {displayName}
              </h1>
              {koreanName ? <p className="mt-1 break-words text-sm text-zinc-500">{koreanName}</p> : null}
              {showVolumeLine ? <p className="mt-2 break-words text-base text-zinc-600">{volume}</p> : null}
              <div className="mt-4">
                <ProductShareButton
                  title={displayName}
                  shareLabel={t("share")}
                  copiedLabel={t("copied")}
                />
              </div>

              <div className="mt-8 min-w-0 rounded-2xl border border-zinc-200 bg-white p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {t("productInformation")}
                </h2>
                <dl className="mt-2">
                  {productCode ? (
                    <InfoRow
                      label={t("productCode")}
                      value={productCode}
                      action={
                        <CopyValueButton
                          value={productCode}
                          label={t("copy")}
                          copiedLabel={t("copied")}
                        />
                      }
                    />
                  ) : null}
                  {barcode ? (
                    <InfoRow
                      label={t("barcode")}
                      value={barcode}
                      action={
                        <CopyValueButton value={barcode} label={t("copy")} copiedLabel={t("copied")} />
                      }
                    />
                  ) : null}
                  {origin ? <InfoRow label={t("origin")} value={origin} /> : null}
                  {volume ? <InfoRow label={t("volume")} value={volume} /> : null}
                  <InfoRow label={t("leadTime")} value={t("leadTimeConfirmed")} />
                  {showMoq ? <InfoRow label={moqLabel} value={t("moqUnit", { count: product.moq })} /> : null}
                  {showUnitsPerBox ? (
                    <InfoRow label={t("unitsPerBox")} value={t("unitsPerBoxValue", { count: product.moq })} />
                  ) : null}
                  {retailAmount != null ? (
                    <InfoRow
                      label={t("retailPrice")}
                      value={formatKRW(retailAmount)}
                    />
                  ) : null}
                  {canViewPrices && priceColumns ? (
                    <InfoRow
                      label={t(priceColumns.primary.labelKey)}
                      value={formatLocaleProductPrice(priceColumns.primary.amount, locale, usdKrwRate)}
                    />
                  ) : null}
                </dl>

                {canViewPrices && priceColumns ? (
                  <div className="mt-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {t(priceColumns.primary.labelKey)}
                    </p>
                    <p className="text-2xl font-bold text-zinc-900">
                      {formatLocaleProductPrice(priceColumns.primary.amount, locale, usdKrwRate)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-5">
                    <p className="text-lg font-semibold text-zinc-800">{t("signInToViewPrice")}</p>
                    <p className="mt-1 text-sm text-zinc-600">{t("signInToViewPriceHint")}</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={withReturnTo("/login", returnTo)}
                        className="inline-flex rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
                      >
                        {t("signInToViewPriceAction")}
                      </Link>
                      <Link
                        href={withReturnTo("/signup", returnTo)}
                        className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800"
                      >
                        {t("createWholesaleAccount")}
                      </Link>
                    </div>
                  </div>
                )}

                <AddToCartForm
                  productId={product.id}
                  productSlug={product.slug}
                  productName={displayName}
                  moq={product.moq}
                  stock={canViewPrices && isPricedStorefrontProduct(product) ? product.stock : 0}
                  soldOut={product.sold_out}
                  canAdd={canViewPrices && isPricedStorefrontProduct(product)}
                  defaultQuantity={Number.isFinite(defaultQty) ? defaultQty : undefined}
                />
              </div>

              {minOrderNote ? (
                <p className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  {minOrderNote}
                </p>
              ) : null}

              {catalogDescription ? (
                <section className="mt-10 min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-900">{t("description")}</h2>
                  <p className="mt-3 whitespace-pre-line break-words leading-relaxed text-zinc-600">
                    {catalogDescription}
                  </p>
                </section>
              ) : null}

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

              <section className="mt-8 min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900">{t("shippingQuotation")}</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("shippingQuotationBody")}</p>
              </section>
              <section className="mt-8 min-w-0">
                <h2 className="text-lg font-semibold text-zinc-900">{t("returns")}</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t("returnsBody")}</p>
              </section>
              {lastUpdated ? (
                <p className="mt-8 text-xs text-zinc-500">{t("lastUpdated", { date: lastUpdated })}</p>
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
