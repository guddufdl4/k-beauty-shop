import Link from "next/link";
import { redirect } from "next/navigation";
import { createProduct } from "@/app/actions/products";
import { AdminProductForm } from "@/components/admin/admin-product-form";
import { AdminProductsToolbar } from "@/components/admin/admin-products-toolbar";
import {
  buildAdminProductsHref,
  resolveAdminProductsTab,
  type AdminProductsFilters,
  type AdminProductsTab,
} from "@/lib/admin/admin-products-url";
import { AdminProductsPagination } from "@/components/admin/admin-products-pagination";
import { AdminProductsTable } from "@/components/admin/admin-products-table";
import { ExcelImportSection } from "@/components/admin/excel-import-section";
import { ProductImageBatchSection } from "@/components/admin/product-image-batch-section";
import { getCachedProductImageBatchStats } from "@/lib/admin/product-image-batch";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { getCategories, getProductImportBatches, getProducts, type ProductImportBatch } from "@/lib/supabase/products";
import { storefrontHref } from "@/lib/store/storefront-href";

const ADMIN_PRODUCTS_PAGE_SIZE = 10;

const CARD_CLASS =
  "flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm";

const PRODUCT_TABS: Array<{ id: AdminProductsTab; label: string }> = [
  { id: "bulk", label: "대량/자동화 등록" },
  { id: "add", label: "상품 개별 등록" },
  { id: "list", label: "상품 목록 및 관리" },
];

type AdminProductsPageProps = {
  searchParams: Promise<{
    batch?: string;
    page?: string;
    q?: string;
    brand?: string;
    category?: string;
    sort?: string;
    view?: string;
    tab?: string;
  }>;
};

function buildWeeklyUploadActivity(batches: ProductImportBatch[]) {
  const days: Array<{ label: string; count: number }> = [];
  const now = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = batches
      .filter((batch) => {
        const created = new Date(batch.created_at);
        return created >= date && created < nextDate;
      })
      .reduce((sum, batch) => sum + batch.imported_count, 0);

    days.push({
      label: date.toLocaleDateString("ko-KR", { weekday: "short" }),
      count,
    });
  }

  return days;
}

function RecentUploadStatusCard({
  batches,
  filters,
}: {
  batches: ProductImportBatch[];
  filters: AdminProductsFilters;
}) {
  const totalImported = batches.reduce((sum, batch) => sum + batch.imported_count, 0);
  const totalFailed = batches.reduce((sum, batch) => sum + batch.failed_count, 0);
  const totalSuccess = Math.max(0, totalImported - totalFailed);
  const weeklyActivity = buildWeeklyUploadActivity(batches);
  const maxCount = Math.max(1, ...weeklyActivity.map((day) => day.count));
  const recentBatch = batches[0] ?? null;

  return (
    <section
      aria-label="최근 업로드 현황"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
    >
      <div className="shrink-0 border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">최근 업로드 현황</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          누적 {totalImported.toLocaleString("ko-KR")}건 처리
          {recentBatch
            ? ` · 마지막 ${new Date(recentBatch.created_at).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : null}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <div>
          <p className="mb-2 text-[11px] font-medium text-zinc-500">최근 7일 업로드</p>
          <div className="flex h-24 items-end gap-1.5">
            {weeklyActivity.map((day) => {
              const heightPct = Math.round((day.count / maxCount) * 100);
              return (
                <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div className="flex h-20 w-full items-end justify-center">
                    <div
                      className="w-full max-w-8 rounded-t bg-gradient-to-t from-violet-500 to-violet-300"
                      style={{ height: `${Math.max(day.count > 0 ? 12 : 4, heightPct)}%` }}
                      title={`${day.count}건`}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
            <dt className="text-[11px] text-emerald-700">성공</dt>
            <dd className="text-lg font-bold text-emerald-800">
              {totalSuccess.toLocaleString("ko-KR")}
            </dd>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
            <dt className="text-[11px] text-red-700">오류</dt>
            <dd className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-red-800">
                {totalFailed.toLocaleString("ko-KR")}
              </span>
              {totalFailed > 0 ? (
                <Link
                  href={buildAdminProductsHref({ ...filters, tab: "list", sort: "recent" })}
                  className="text-[11px] font-medium text-red-600 hover:underline"
                >
                  내역 보기
                </Link>
              ) : null}
            </dd>
          </div>
        </dl>

        {batches.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-zinc-500">최근 배치</p>
            {batches.slice(0, 3).map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-800">{batch.filename}</p>
                  <p className="text-[10px] text-zinc-500">
                    {batch.imported_count}/{batch.row_count} · 실패 {batch.failed_count}
                  </p>
                </div>
                <Link
                  href={buildAdminProductsHref({
                    ...filters,
                    tab: "list",
                    batchId: batch.id,
                  })}
                  className="shrink-0 text-[10px] text-rose-600 hover:underline"
                >
                  보기
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-400">
            아직 업로드 이력이 없습니다
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-100 px-4 py-2.5">
        <Link
          href={buildAdminProductsHref({ ...filters, tab: "list", sort: "recent" })}
          className="text-xs font-medium text-violet-600 hover:underline"
        >
          최근 수정 내역 보기 →
        </Link>
      </div>
    </section>
  );
}

function ProductsTabNav({
  activeTab,
  filters,
}: {
  activeTab: AdminProductsTab;
  filters: AdminProductsFilters;
}) {
  return (
    <nav
      aria-label="상품 관리 탭"
      className="mb-2 flex shrink-0 gap-0.5 overflow-x-auto border-b border-zinc-200"
    >
      {PRODUCT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={buildAdminProductsHref({
              ...filters,
              tab: tab.id,
            })}
            className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
              isActive
                ? "border-rose-500 text-rose-700"
                : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
    tab: tabQuery,
  } = await searchParams;
  const activeBatchId = batchQuery?.trim() || null;
  const searchTerm = searchQuery?.trim() || undefined;
  const brandFilter = brandQuery?.trim() || undefined;
  const categoryFilter = categoryQuery?.trim() || undefined;
  const sortRecent = sortQuery?.trim() === "recent";
  const showDeleted = viewQuery?.trim() === "deleted";
  const activeTab = resolveAdminProductsTab(tabQuery);
  const currentPage = Math.max(1, Number.parseInt(pageQuery ?? "1", 10) || 1);
  const listFilters: AdminProductsFilters = {
    batchId: activeBatchId,
    q: searchTerm ?? null,
    brand: brandFilter ?? null,
    category: categoryFilter ?? null,
    sort: sortRecent ? ("recent" as const) : null,
    view: showDeleted ? ("deleted" as const) : ("active" as const),
    tab: activeTab,
  };
  const needsCategories = activeTab === "list" || activeTab === "add";
  const needsProducts = activeTab === "list";
  const needsBatches = activeTab === "bulk" || activeTab === "list";
  const needsImageStats = activeTab === "bulk";
  const [
    { configured, user, profile },
    { categories },
    { products, totalCount },
    { batches },
    imageStatsResult,
  ] = await Promise.all([
    getSessionProfile(),
    needsCategories
      ? getCategories()
      : Promise.resolve({
          categories: [],
          meta: { source: "database" as const, configured: true },
        }),
    needsProducts
      ? getProducts({
          includeDraft: true,
          privileged: true,
          importBatchId: activeBatchId ?? undefined,
          categorySlug: categoryFilter,
          search: searchTerm,
          brand: brandFilter,
          limit: ADMIN_PRODUCTS_PAGE_SIZE,
          page: currentPage,
          orderBy: sortRecent ? "updated_at" : "created_at",
          deletionFilter: showDeleted ? "deleted" : "active",
          imageFirst: true,
          lightSelect: true,
        })
      : Promise.resolve({
          products: [],
          totalCount: 0,
          meta: { source: "database" as const, configured: true },
        }),
    needsBatches
      ? getProductImportBatches()
      : Promise.resolve({
          batches: [],
          meta: { source: "database" as const, configured: true },
        }),
    needsImageStats
      ? getCachedProductImageBatchStats()
      : Promise.resolve({ stats: null, error: null }),
  ]);
  const imageStats = imageStatsResult.stats;
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));
  const listProducts = products.map((product) => {
    if (product.import_batch?.filename || !product.import_batch_id) {
      return product;
    }

    const batch = batchById.get(product.import_batch_id);
    if (!batch) {
      return product;
    }

    return {
      ...product,
      import_batch: { id: batch.id, filename: batch.filename },
    };
  });
  const lastCollectedAt = batches[0]?.created_at ?? null;
  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / ADMIN_PRODUCTS_PAGE_SIZE),
  );
  if (totalCount > 0 && currentPage > totalPages) {
    redirect(buildAdminProductsHref(listFilters, totalPages));
  }
  const safePage = currentPage;
  const activeBatch = activeBatchId
    ? batches.find((batch) => batch.id === activeBatchId) ?? null
    : null;
  const hasListFilters = Boolean(searchTerm || brandFilter || categoryFilter);
  const emptyMessage = showDeleted
    ? hasListFilters || activeBatchId
      ? "검색 조건에 맞는 삭제된 상품이 없습니다."
      : "삭제된 상품이 없습니다."
    : activeBatchId
      ? hasListFilters
        ? "선택한 엑셀 배치에서 검색 조건에 맞는 상품이 없습니다."
        : "선택한 엑셀 배치에 등록된 상품이 없습니다."
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
    <main className="flex w-full max-w-none flex-col px-2 py-2 sm:px-3 lg:min-h-[calc(100vh-3.5rem)]">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500">
            Admin
          </p>
          <h1 className="truncate text-lg font-bold text-zinc-900 sm:text-xl">
            상품 관리
          </h1>
        </div>
        <Link
          href="/admin"
          className="shrink-0 text-xs text-zinc-500 hover:text-rose-600 sm:text-sm"
        >
          ← 대시보드
        </Link>
      </div>

      <ProductsTabNav activeTab={activeTab} filters={listFilters} />

      {activeTab === "bulk" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            <div id="excel-import" className="scroll-mt-24">
              <ExcelImportSection
                batches={batches}
                activeBatchId={activeBatchId}
                variant="card"
                lastCollectedAt={lastCollectedAt}
              />
            </div>
            <RecentUploadStatusCard batches={batches} filters={listFilters} />
          </div>
          <ProductImageBatchSection
            initialStats={imageStats}
            variant="management"
          />
        </div>
      ) : null}

      {activeTab === "add" ? (
        <section className={CARD_CLASS} aria-label="상품 개별 등록">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">상품 개별 등록</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              SKU·브랜드·가격 등을 직접 입력해 단건 등록합니다.
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <AdminProductForm
              action={createProduct}
              categories={categories}
              embedded
            />
          </div>
        </section>
      ) : null}

      {activeTab === "list" ? (
        <section className={`${CARD_CLASS} min-h-0 flex-1`} aria-label="상품 목록 및 관리">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 space-y-2 border-b border-zinc-100 p-2">
              <AdminProductsToolbar
                filters={listFilters}
                categories={categories}
                batches={batches}
                totalCount={totalCount}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs">
                <div className="text-zinc-600">
                  {activeBatch ? (
                    <span>
                      <span className="font-medium text-zinc-800">{activeBatch.filename}</span>
                      {" "}배치 · 이미지 있는 상품 우선 정렬
                      {totalCount > 0
                        ? ` · 총 ${totalCount.toLocaleString("ko-KR")}건 · 페이지 ${safePage} / ${totalPages}`
                        : null}
                    </span>
                  ) : (
                    <span>
                      {totalCount > 0
                        ? `총 ${totalCount.toLocaleString("ko-KR")}건 · 이미지 있는 상품 우선 · 페이지 ${safePage} / ${totalPages}`
                        : "목록이 비어 있습니다"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={storefrontHref("/products")}
                    className="text-rose-600 hover:underline"
                  >
                    스토어 보기
                  </Link>
                  {activeBatchId ? (
                    <Link
                      href={buildAdminProductsHref({
                        ...listFilters,
                        batchId: null,
                      })}
                      className="text-zinc-500 hover:underline"
                    >
                      엑셀 필터 해제
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <AdminProductsTable
                key={`${safePage}-${activeBatchId ?? ""}-${searchTerm ?? ""}-${brandFilter ?? ""}-${categoryFilter ?? ""}-${sortRecent ? "recent" : "created"}-${showDeleted ? "deleted" : "active"}`}
                products={listProducts}
                categories={categories}
                emptyMessage={emptyMessage}
                viewMode={showDeleted ? "deleted" : "active"}
              />
            </div>

            {totalPages > 1 ? (
              <AdminProductsPagination
                currentPage={safePage}
                totalPages={totalPages}
                totalCount={totalCount}
                filters={listFilters}
              />
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
