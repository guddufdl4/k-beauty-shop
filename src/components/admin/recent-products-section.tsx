import Link from "next/link";
import {
  buildAdminProductsHref,
  type AdminProductsFilters,
} from "@/lib/admin/admin-products-url";
import { resolveProductImageUrl } from "@/lib/product-images";
import type { ProductWithRelations } from "@/lib/supabase/products";

type Props = {
  products: ProductWithRelations[];
  filters: AdminProductsFilters;
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

export function RecentProductsSection({ products, filters }: Props) {
  if (products.length === 0) {
    return null;
  }

  const isRecentSortActive = filters.sort === "recent";

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-50 px-4 py-4 sm:px-6">
        <div>
          <h2 className="font-semibold text-zinc-900">최근 업로드·수정</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            마지막으로 변경된 상품 {products.length}건
          </p>
        </div>
        {!isRecentSortActive ? (
          <Link
            href={buildAdminProductsHref({ ...filters, sort: "recent" })}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:border-violet-300 hover:bg-violet-100"
          >
            전체 목록 최근 수정순 →
          </Link>
        ) : null}
      </div>

      <ul className="divide-y divide-zinc-100">
        {products.map((product) => {
          const imageUrl = resolveProductImageUrl(product);
          const label = activityLabel(product);

          return (
            <li
              key={product.id}
              className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      label === "업로드"
                        ? "bg-sky-100 text-sky-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {formatRelativeTime(product.updated_at)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm font-medium text-zinc-900">
                  {product.name}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
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
              </div>
              <Link
                href={buildAdminProductsHref({
                  ...filters,
                  q: product.sku,
                  sort: null,
                })}
                className="shrink-0 text-xs font-medium text-rose-600 hover:underline"
              >
                찾기
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
