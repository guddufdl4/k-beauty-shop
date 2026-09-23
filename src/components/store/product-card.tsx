"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatLocaleProductPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  isCategoryPlaceholderUrl,
  resolveProductImageUrl,
} from "@/lib/product-images";
import {
  getCardDisplayPrice,
  getDisplayBrandName,
  isPricedStorefrontProduct,
  isProductSoldOut,
  usesBoxQuantityField,
} from "@/lib/store/products-url";
import { getLocalizedProductName } from "@/lib/store/localized-product-name";
import type { StorefrontProduct } from "@/lib/supabase/products";

type ProductCardBadge = {
  type: "featured" | "bestSeller" | "new" | "sale";
  label: string;
};

type Props = {
  product: StorefrontProduct;
  compact?: boolean;
  variant?: "default" | "trending";
  badge?: ProductCardBadge;
  locale: string;
  usdKrwRate: number;
  moqBadge?: string;
  soldOutLabel?: string;
  signInToViewPriceLabel?: string;
  priority?: boolean;
};

const SOLD_OUT_LABELS: Record<string, string> = {
  ko: "품절",
  en: "Out of stock",
  ja: "在庫切れ",
  zh: "缺货",
};

export function ProductCard({
  product,
  compact = false,
  variant = "default",
  badge,
  locale,
  usdKrwRate,
  moqBadge,
  soldOutLabel: soldOutLabelProp,
  signInToViewPriceLabel,
  priority = false,
}: Props) {
  const localeFromApp = useLocale();
  const activeLocale = localeFromApp || locale;
  const isTrending = variant === "trending";
  const showPrices = isPricedStorefrontProduct(product);
  const primaryImage = product.images.find((img) => img.is_primary) ?? product.images[0];
  const displayImageUrl = resolveProductImageUrl(product);
  const isPlaceholder = isCategoryPlaceholderUrl(displayImageUrl);
  const displayPrice = showPrices ? getCardDisplayPrice(product) : null;
  const soldOut = isProductSoldOut(product);
  const soldOutLabel = soldOutLabelProp ?? SOLD_OUT_LABELS[activeLocale] ?? SOLD_OUT_LABELS.en;
  const displayName = getLocalizedProductName(product, activeLocale);
  const quantityBadge =
    moqBadge ??
    (usesBoxQuantityField(product) ? `${product.moq}/box` : `MOQ ${product.moq}`);
  const showMoq = !compact || isTrending;

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group flex h-full min-w-0 max-w-full flex-col",
        isTrending && "rounded-xl border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-md",
      )}
    >
      <div className="relative">
        {primaryImage ? (
          <div
            className={cn(
              "relative w-full max-w-full overflow-hidden bg-zinc-50",
              isTrending
                ? "mb-3 h-[170px] rounded-lg sm:aspect-square sm:h-auto"
                : compact
                  ? "mb-3"
                  : "mb-4 rounded-sm border border-zinc-100 aspect-square",
            )}
          >
            <Image
              src={displayImageUrl}
              alt={primaryImage.alt_text ?? displayName}
              width={400}
              height={400}
              sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
              quality={70}
              priority={priority}
              loading={priority ? "eager" : "lazy"}
              className={cn(
                "absolute inset-0 h-full w-full object-contain",
                isPlaceholder && "p-8",
              )}
            />
          </div>
        ) : (
          <div
            className={cn(
              "flex w-full max-w-full flex-col items-center justify-center gap-2 overflow-hidden bg-zinc-50 p-4 text-center",
              isTrending
                ? "mb-3 h-[170px] rounded-lg sm:aspect-square sm:h-auto"
                : compact
                  ? "mb-3"
                  : "mb-4 rounded-sm border border-zinc-100 aspect-square",
            )}
          >
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              {getDisplayBrandName(product.brand)}
            </span>
          </div>
        )}
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded-sm bg-zinc-800 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
            {soldOutLabel}
          </span>
        ) : null}
        {!soldOut && badge ? (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-sm px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white",
              badge.type === "bestSeller" && "bg-zinc-900",
              badge.type === "featured" && "bg-violet-700",
              badge.type === "new" && "bg-accent",
              badge.type === "sale" && "bg-rose-600",
            )}
          >
            {badge.label}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {getDisplayBrandName(product.brand)}
        </p>
        <h3
          className={cn(
            "line-clamp-2 font-normal leading-snug text-zinc-900 group-hover:text-accent",
            isTrending || compact ? "min-h-[2.5rem] text-sm" : "text-base",
          )}
        >
          {displayName}
        </h3>
        {!compact && !isTrending && product.short_description ? (
          <p className="line-clamp-2 text-xs text-zinc-500">{product.short_description}</p>
        ) : null}
        <div className={cn("mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-2")}>
          <div className="min-w-0 flex-1">
            {showPrices && displayPrice != null ? (
              <>
                <p className={cn("font-bold text-zinc-900", isTrending || compact ? "text-sm" : "text-base")}>
                {formatLocaleProductPrice(displayPrice, activeLocale, usdKrwRate)}
                </p>
              </>
            ) : (
              <p className={cn("font-semibold text-zinc-600", isTrending || compact ? "text-sm" : "text-base")}>
                {signInToViewPriceLabel ?? "Sign in to view price"}
              </p>
            )}
          </div>
          {showMoq ? (
            <span className="shrink-0 rounded-sm bg-zinc-100 px-2 py-0.5 text-[11px] font-medium leading-5 text-zinc-600">
              {quantityBadge}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
