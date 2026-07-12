import Link from "next/link";
import { redirect } from "next/navigation";
import { createProduct } from "@/app/actions/products";
import { AdminProductForm } from "@/components/admin/admin-product-form";
import { AdminProductsToolbar } from "@/components/admin/admin-products-toolbar";
import { buildAdminProductsHref } from "@/lib/admin/admin-products-url";
import { AdminProductsTable } from "@/components/admin/admin-products-table";
import { ExcelImportSection } from "@/components/admin/excel-import-section";
import { ProductImageBatchSection } from "@/components/admin/product-image-batch-section";
import { getProductImageBatchStats } from "@/lib/admin/product-image-batch";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { createSafeClient } from "@/lib/supabase/safe-server";
import { getCategories, getProductImportBatches, getProducts, getRecentlyUpdatedProducts } from "@/lib/supabase/products";
import { storefrontHref } from "@/lib/store/storefront-href";

const ADMIN_PRODUCTS_PAGE_SIZE = 50;

function formatRecentTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AdminProductsPageProps = {
  searchParams: Promise<{
    batch?: string;
    page?: string;
    q?: string;
    brand?: string;
    category?: string;
    sort?: string;
    view?: string;
  }>;
};

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const {
    batch: batchQuery,
    page: pageQuery,
    q: searchQuery,
    brand: brandQuery,
    category: categoryQuery,
    sort: sortQuery,
    view: viewQuery,
  } = await searchParams;
  const activeBatchId = batchQuery?.trim() || null;
  const searchTerm = searchQuery?.trim() || undefined;
  const brandFilter = brandQuery?.trim() || undefined;
  const categoryFilter = categoryQuery?.trim() || undefined;
  const sortRecent = sortQuery?.trim() === "recent";
  const showDeleted = viewQuery?.trim() === "deleted";
  const currentPage = Math.max(1, Number.parseInt(pageQuery ?? "1", 10) || 1);
  const listFilters = {
    batchId: activeBatchId,
    q: searchTerm ?? null,
    brand: brandFilter ?? null,
    category: categoryFilter ?? null,
    sort: sortRecent ? ("recent" as const) : null,
    view: showDeleted ? ("deleted" as const) : ("active" as const),
  };
  const { configured, user, profile } = await getSessionProfile();
  const supabase = await createSafeClient();
  const [{ categories }, { products, totalCount }, { batches }, { products: recentProducts }, imageStatsResult] =
    await Promise.all([
      getCategories(),
      getProducts({
        includeDraft: true,
        importBatchId: activeBatchId ?? undefined,
        categorySlug: categoryFilter,
        search: searchTerm,
        brand: brandFilter,
        limit: ADMIN_PRODUCTS_PAGE_SIZE,
        page: currentPage,
        orderBy: sortRecent ? "updated_at" : "created_at",
        deletionFilter: showDeleted ? "deleted" : "active",
      }),
      getProductImportBatches(),
      activeBatchId ? Promise.resolve({ products: [] }) : getRecentlyUpdatedProducts(12),
      supabase
        ? getProductImageBatchStats(supabase)
        : Promise.resolve({ stats: null, error: null }),
    ]);
  const imageStats = imageStatsResult.stats;
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / ADMIN_PRODUCTS_PAGE_SIZE),
  );
  if (totalCount > 0 && currentPage > totalPages) {
    redirect(buildAdminProductsHref(listFilters, totalPages));
  }
  const safePage = currentPage;
  const pageStart =
    totalCount === 0 ? 0 : (safePage - 1) * ADMIN_PRODUCTS_PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * ADMIN_PRODUCTS_PAGE_SIZE, totalCount);
  const hasListFilters = Boolean(searchTerm || brandFilter || categoryFilter);
  const emptyMessage = showDeleted
    ? hasListFilters
      ? "검색 조건에 맞는 삭제된 상품이 없습니다."
      : "삭제된 상품이 없습니다."
    : hasListFilters
      ? "검색 조건에 맞는 상품이 없습니다."
      : "등록된 상품이 없습니다. seed SQL을 실행하거나 폼으로 추가하세요.";

  if (!configured) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 상품 관리</h1>
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabase가 설정되지 않았습니다.{" "}
          <code className="text-xs">.env.local</code>에 URL과 anon key를
          추가한 뒤 다시 시도하세요.
        </p>
        <Link href={storefrontHref()} className="mt-6 inline-block text-sm text-rose-600 hover:underline">
          ← 홈으로
        </Link>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 상품 관리</h1>
        <p className="mt-4 text-zinc-600">
          상품을 관리하려면 관리자 계정으로 로그인해야 합니다.
        </p>
        <Link
          href={storefrontHref("/login")}
          className="mt-6 inline-flex rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
        >
          로그인
        </Link>
      </main>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 상품 관리</h1>
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          접근 권한이 없습니다. 관리자(role=admin) 프로필이 필요합니다.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Supabase SQL Editor에서{" "}
          <code className="text-xs">
            update profiles set role = &apos;admin&apos; where email = &apos;your@email.com&apos;;
          </code>
        </p>
        <Link href="/account" className="mt-6 inline-block text-sm text-rose-600 hover:underline">
          마이페이지로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-rose-500">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-bold text-zinc-900">상품 관리</h1>
        </div>
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-rose-600">
          ← 대시보드
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div id="excel-import" className="scroll-mt-24 lg:sticky lg:top-4 lg:z-10">
            <ExcelImportSection batches={batches} activeBatchId={activeBatchId} />
          </div>
          <ProductImageBatchSection initialStats={imageStats} compact />
          <AdminProductForm action={createProduct} categories={categories} />
        </div>

        <div className="space-y-4 lg:col-span-3">
          {!activeBatchId && recentProducts.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-50 px-6 py-4">
                <div>
                  <h2 className="font-semibold text-zinc-900">최근 업로드/수정</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    이미지 업로드·정보 수정 기준 최근 {recentProducts.length}건
                  </p>
                </div>
                <Link
                  href={buildAdminProductsHref({ ...listFilters, sort: "recent" })}
                  className="text-xs font-medium text-violet-600 hover:underline"
                >
                  전체 보기 →
                </Link>
              </div>
              <ul className="divide-y divide-zinc-100">
                {recentProducts.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{product.name}</p>
                      <p className="font-mono text-[11px] text-zinc-400">{product.sku}</p>
                    </div>
                    <p className="shrink-0 text-[11px] text-zinc-500">
                      {formatRecentTimestamp(product.updated_at)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <AdminProductsToolbar
            filters={listFilters}
            categories={categories}
            totalCount={totalCount}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm">
            <div className="text-zinc-600">
              {activeBatchId ? (
                <span>
                  배치 필터 적용 중
                  {totalCount > 0
                    ? ` · ${pageStart.toLocaleString("ko-KR")}–${pageEnd.toLocaleString("ko-KR")} / ${safePage}/${totalPages}페이지`
                    : null}
                </span>
              ) : (
                <span>
                  {totalCount > 0
                    ? `${pageStart.toLocaleString("ko-KR")}–${pageEnd.toLocaleString("ko-KR")} / ${safePage}/${totalPages}페이지`
                    : "목록이 비어 있습니다"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link href={storefrontHref("/products")} className="text-rose-600 hover:underline">
                스토어 프론트 보기
              </Link>
              {activeBatchId ? (
                <Link
                  href={buildAdminProductsHref({
                    batchId: null,
                    q: listFilters.q,
                    brand: listFilters.brand,
                    category: listFilters.category,
                    sort: listFilters.sort,
                    view: listFilters.view,
                  })}
                  className="text-zinc-500 hover:underline"
                >
                  배치 필터 해제
                </Link>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
            <div className="border-b border-rose-50 px-6 py-4">
              <h2 className="font-semibold text-zinc-900">
                {showDeleted
                  ? "삭제된 상품"
                  : sortRecent
                    ? "최근 수정 상품"
                    : "등록 상품"}
              </h2>
              {showDeleted ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  스토어에서 숨겨진 상품 · 복구하면 다시 노출됩니다
                </p>
              ) : sortRecent ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  수정일 기준 최신순 · 이미지 업로드·정보 수정 포함
                </p>
              ) : null}
            </div>
            <AdminProductsTable
              key={`${safePage}-${activeBatchId ?? ""}-${searchTerm ?? ""}-${brandFilter ?? ""}-${categoryFilter ?? ""}-${sortRecent ? "recent" : "created"}-${showDeleted ? "deleted" : "active"}`}
              products={products}
              emptyMessage={emptyMessage}
              viewMode={showDeleted ? "deleted" : "active"}
            />
            {totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-rose-50 px-6 py-4">
                {safePage > 1 ? (
                  <Link
                    href={buildAdminProductsHref(listFilters, safePage - 1)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
                  >
                    ← 이전
                  </Link>
                ) : (
                  <span className="text-sm text-zinc-300">← 이전</span>
                )}
                <p className="text-sm text-zinc-500">
                  {safePage} / {totalPages}
                </p>
                {safePage < totalPages ? (
                  <Link
                    href={buildAdminProductsHref(listFilters, safePage + 1)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
                  >
                    다음 →
                  </Link>
                ) : (
                  <span className="text-sm text-zinc-300">다음 →</span>
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-6 py-4">
              <h2 className="font-semibold text-zinc-900">최근 import 배치</h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {batches.length === 0 ? (
                <p className="px-6 py-8 text-sm text-zinc-500">
                  import 이력이 없습니다.
                </p>
              ) : (
                batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-zinc-900">{batch.filename}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(batch.created_at).toLocaleString("ko-KR")} ·{" "}
                        {batch.imported_count}/{batch.row_count} 처리 · 실패{" "}
                        {batch.failed_count}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          batch.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : batch.status === "partial"
                              ? "bg-amber-100 text-amber-700"
                              : batch.status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {batch.status}
                      </span>
                      <Link
                        href={buildAdminProductsHref({
                          batchId: batch.id,
                          q: listFilters.q,
                          brand: listFilters.brand,
                          category: listFilters.category,
                          sort: listFilters.sort,
                          view: listFilters.view,
                        })}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        이 배치만 보기
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
