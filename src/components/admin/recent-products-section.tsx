import Link from "next/link";
import { ProductNameWithCopy } from "@/components/admin/product-name-with-copy";
import {
  buildAdminProductsHref,
  type AdminProductsFilters,
} from "@/lib/admin/admin-products-url";
import { resolveProductImageUrl } from "@/lib/product-images";
import type { ProductWithRelations } from "@/lib/supabase/products";

type Props = {
  products: ProductWithRelations[];
  filters: AdminProductsFilters;
  dense?: boolean;
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "방금 전";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }

  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityLabel(product: ProductWithRelations): string {
  const created = new Date(product.created_at).getTime();
  const updated = new Date(product.updated_at).getTime();

  if (Math.abs(updated - created) < 60_000) {
    return "업로드";
  }

  return "수정";
}

export function RecentProductsSection({ products, filters, dense }: Props) {
  if (products.length === 0) {
    return null;
  }

  const isRecentSortActive = filters.sort === "recent";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div
        className={`flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-violet-50 ${
          dense ? "px-3 py-2" : "px-4 py-4 sm:px-6"
        }`}
      >
        <div>
          <h2 className="font-semibold text-zinc-900">최근 업로드·수정</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            마지막으로 변경된 상품 {products.length}건
          </p>
        </div>
        {!isRecentSortActive ? (
          <Link
            href={buildAdminProductsHref({ ...filters, tab: "list", sort: "recent" })}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:border-violet-300 hover:bg-violet-100"
          >
            전체 목록 최신 수집순 →
          </Link>
        ) : null}
      </div>

      <div
        className={`min-h-0 flex-1 overflow-auto ${
          dense
            ? "grid grid-cols-1 gap-2 p-2 sm:grid-cols-2"
            : "grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-6"
        }`}
      >
        {products.map((product) => {
          const imageUrl = resolveProductImageUrl(product);
          const label = activityLabel(product);

          return (
            <div
              key={product.id}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-violet-50 bg-violet-50/30 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        label === "업로드"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {label}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {formatRelativeTime(product.updated_at)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <ProductNameWithCopy
                      name={product.name}
                      textClassName="line-clamp-2 text-sm font-medium leading-snug text-zinc-900"
                    />
                  </div>
                </div>
              </div>
              <p className="truncate font-mono text-[11px] text-zinc-500">
                {product.barcode ? (
                  <>
                    <span className="text-zinc-400">바코드 </span>
                    {product.barcode}
                    <span className="mx-1.5 text-zinc-300">·</span>
                  </>
                ) : null}
                <span className="text-zinc-400">SKU </span>
                {product.sku}
              </p>
              <Link
                href={buildAdminProductsHref({
                  ...filters,
                  tab: "list",
                  q: product.sku,
                  sort: null,
                })}
                className="mt-auto text-xs font-medium text-rose-600 hover:underline"
              >
                찾기
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
