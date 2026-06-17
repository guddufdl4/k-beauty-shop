import { Link } from "@/i18n/navigation";
import { formatKRW } from "@/lib/utils";
import type { ProductWithRelations } from "@/lib/supabase/products";

type Props = {
  product: ProductWithRelations;
};

export function ProductCard({ product }: Props) {
  const primaryImage =
    product.images.find((img) => img.is_primary) ?? product.images[0];

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-rose-50 via-white to-zinc-50">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage.url}
            alt={primaryImage.alt_text ?? product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <span className="text-3xl opacity-40">✨</span>
            <span className="text-xs font-medium uppercase tracking-wider text-rose-400">
              {product.brand}
            </span>
          </div>
        )}
        {product.is_featured ? (
          <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Featured
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-rose-500">
          {product.brand}
        </p>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 group-hover:text-rose-700">
          {product.name}
        </h3>
        {product.short_description ? (
          <p className="line-clamp-2 text-xs text-zinc-500">
            {product.short_description}
          </p>
        ) : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="text-base font-bold text-zinc-900">
              {formatKRW(product.price)}
            </p>
            {product.compare_at_price ? (
              <p className="text-xs text-zinc-400 line-through">
                {formatKRW(product.compare_at_price)}
              </p>
            ) : null}
          </div>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
            MOQ {product.moq}
          </span>
        </div>
      </div>
    </Link>
  );
}
