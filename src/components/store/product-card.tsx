import { Link } from "@/i18n/navigation";
import { formatLocaleProductPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  isCategoryPlaceholderUrl,
  resolveProductImageUrl,
} from "@/lib/product-images";
import { isProductSoldOut } from "@/lib/store/products-url";
import type { ProductWithRelations } from "@/lib/supabase/products";

type Props = {
  product: ProductWithRelations;
  compact?: boolean;
  badge?: { type: "hot" | "new"; label: string };
  locale: string;
  usdKrwRate: number;
};

const SOLD_OUT_LABELS: Record<string, string> = {
  ko: "품절",
  en: "Out of stock",
  ja: "在庫切れ",
  zh: "缺货",
};

export function ProductCard({ product, compact = false, badge, locale, usdKrwRate }: Props) {
  const primaryImage = product.images.find((img) => img.is_primary) ?? product.images[0];
  const displayImageUrl = resolveProductImageUrl(product);
  const isPlaceholder = isCategoryPlaceholderUrl(displayImageUrl);
  const displayPrice = product.wholesale_price ?? product.price;
  const soldOut = isProductSoldOut(product);
  const soldOutLabel = SOLD_OUT_LABELS[locale] ?? SOLD_OUT_LABELS.en;

  return (
    <Link href={`/products/${product.slug}`} className="group flex min-w-0 max-w-full flex-col">
      <div className="relative">
        {primaryImage ? (
          <div
            className={cn(
              "relative aspect-square w-full max-w-full bg-zinc-50",
              compact ? "mb-3" : "mb-4 rounded-sm border border-zinc-100",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl}
              alt={primaryImage.alt_text ?? product.name}
              className={cn(
                "absolute inset-0 h-full w-full object-contain",
                isPlaceholder && "p-8",
              )}
            />
          </div>
        ) : (
          <div
            className={cn(
              "flex aspect-square w-full max-w-full flex-col items-center justify-center gap-2 overflow-hidden bg-zinc-50 p-4 text-center",
              compact ? "mb-3" : "mb-4 rounded-sm border border-zinc-100",
            )}
          >
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{product.brand}</span>
          </div>
        )}
        {soldOut ? (
          <span className="absolute left-2 top-2 bg-zinc-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {soldOutLabel}
          </span>
        ) : null}
        {badge ? (
          <span
            className={cn(
              "absolute right-2 top-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
              badge.type === "hot" ? "bg-orange-500" : "bg-accent",
            )}
          >
            {badge.label}
          </span>
        ) : null}
        {!badge && product.is_featured && !compact ? (
          <span className="absolute right-2 top-2 bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            HOT
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{product.brand}</p>
        <h3
          className={cn(
            "line-clamp-2 font-normal leading-snug text-zinc-900 group-hover:text-accent",
            compact ? "text-sm" : "text-base",
          )}
        >
          {product.name}
        </h3>
        {!compact && product.short_description ? (
          <p className="line-clamp-2 text-xs text-zinc-500">{product.short_description}</p>
        ) : null}
        <div className={cn("flex items-end justify-between gap-2", compact ? "mt-1" : "mt-auto pt-2")}>
          <p className={cn("font-bold text-zinc-900", compact ? "text-sm" : "text-base")}>
            {formatLocaleProductPrice(displayPrice, locale, usdKrwRate)}
          </p>
          {!compact ? (
            <span className="rounded-sm bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
              MOQ {product.moq}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
