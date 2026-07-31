import { Link } from "@/i18n/navigation";
import { formatLocaleProductPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  isCategoryPlaceholderUrl,
  resolveProductImageUrl,
} from "@/lib/product-images";
import {
  getCardDisplayPrice,
  getCompareAtPrice,
  getDisplayBrandName,
  isProductSoldOut,
  usesBoxQuantityField,
} from "@/lib/store/products-url";
import type { ProductWithRelations } from "@/lib/supabase/products";

type ProductCardBadge = {
  type: "bestSeller" | "new" | "sale";
  label: string;
};

type Props = {
  product: ProductWithRelations;
  compact?: boolean;
  variant?: "default" | "trending";
  badge?: ProductCardBadge;
  locale: string;
  usdKrwRate: number;
  moqBadge?: string;
  soldOutLabel?: string;
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
}: Props) {
  const isTrending = variant === "trending";
  const primaryImage = product.images.find((img) => img.is_primary) ?? product.images[0];
  const displayImageUrl = resolveProductImageUrl(product);
  const isPlaceholder = isCategoryPlaceholderUrl(displayImageUrl);
  const displayPrice = getCardDisplayPrice(product);
  const compareAtPrice = getCompareAtPrice(product);
  const soldOut = isProductSoldOut(product);
  const soldOutLabel = soldOutLabelProp ?? SOLD_OUT_LABELS[locale] ?? SOLD_OUT_LABELS.en;
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl}
              alt={primaryImage.alt_text ?? product.name}
              width={400}
              height={400}
              loading="lazy"
              decoding="async"
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
          {product.name}
        </h3>
        {!compact && !isTrending && product.short_description ? (
          <p className="line-clamp-2 text-xs text-zinc-500">{product.short_description}</p>
        ) : null}
        <div className={cn("mt-auto flex items-end justify-between gap-2", isTrending ? "pt-2" : compact ? "mt-1" : "pt-2")}>
          <div className="min-w-0">
            <p className={cn("font-bold text-zinc-900", isTrending || compact ? "text-sm" : "text-base")}>
              {formatLocaleProductPrice(displayPrice, locale, usdKrwRate)}
            </p>
            {compareAtPrice ? (
              <p className="text-xs text-zinc-400 line-through">
                {formatLocaleProductPrice(compareAtPrice, locale, usdKrwRate)}
              </p>
            ) : null}
          </div>
          {showMoq ? (
            <span className="shrink-0 rounded-sm bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {quantityBadge}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
