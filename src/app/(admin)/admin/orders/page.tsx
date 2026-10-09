import { COUNTRY_REGIONS } from "@/lib/auth/country-regions";
import Link from "next/link";
import { OrderWorkspace } from "@/components/admin/order-workspace";
import { listOrderAdmins } from "@/lib/admin/order-workflow";
import { ORDER_STAGES, normalizeOrderFilters, type OrderFilters } from "@/lib/admin/order-workflow-policy";
import { AdminOrderPeriodTotals } from "@/components/admin/order-period-totals";
import { OrderDateFilters } from "@/components/admin/order-date-filters";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  buildAdminOrdersHref,
  listAdminOrders,
  parseAdminOrdersPage,
  parseAdminOrdersView,
  normalizeAdminOrderDateRange,
  type AdminOrderDateRange,
} from "@/lib/admin/orders";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { storefrontHref } from "@/lib/store/storefront-href";

export const dynamic = "force-dynamic";

type AdminOrdersPageProps = {
  searchParams: Promise<{ page?: string | string[]; view?: string | string[]; start?: string | string[]; end?: string | string[]; q?: string; stage?: string; country?: string; focus?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { configured, user, profile } = await getSessionProfile();
  const params = await searchParams;
  const view = parseAdminOrdersView(params.view);
  const requestedPage = parseAdminOrdersPage(params.page);
  const filters = normalizeOrderFilters({ q: params.q, stage: params.stage, country: params.country, focus: params.focus });
  if (configured && (!user || profile?.role !== "admin")) return <main className="p-10">관리자 권한이 필요합니다.</main>;
  const admins = configured ? await listOrderAdmins() : [];
  const range = normalizeAdminOrderDateRange({ start: Array.isArray(params.start) ? params.start[0] : params.start, end: Array.isArray(params.end) ? params.end[0] : params.end });
  const {
    orders,
    demoNote,
    total,
    page,
    totalPages,
    amountTotal,
    pageAmountTotal,
    periodTotals,
    deletedCount,
  } = await listAdminOrders(requestedPage, view, range, filters, user?.id);
  const from = total === 0 ? 0 : (page - 1) * ADMIN_ORDERS_PAGE_SIZE + 1;
  const to = Math.min(page * ADMIN_ORDERS_PAGE_SIZE, total);

  if (!configured) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 주문 관리</h1>
        {demoNote ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {demoNote}
          </p>
        ) : null}
        <AdminOrderPeriodTotals totals={periodTotals} view={view} />
        <OrderWorkspace admins={admins}
          orders={orders}
          view={view}
          amountTotal={amountTotal}
          pageAmountTotal={pageAmountTotal}
          total={total}
        />
        <OrdersPagination page={page} totalPages={totalPages} view={view} range={range} filters={filters} />
        <Link href="/admin" className="mt-8 inline-block text-sm text-rose-600 hover:underline">
          ← 대시보드
        </Link>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 주문 관리</h1>
        <p className="mt-4 text-zinc-600">주문을 보려면 관리자 계정으로 로그인하세요.</p>
        <Link
          href={storefrontHref("/login")}
          className="mt-6 inline-flex rounded-lg bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
        >
          로그인
        </Link>
      </main>
    );
  }

  if (profile?.role !== "admin") {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 주문 관리</h1>
        <p className="mt-4 text-zinc-600">관리자 권한이 필요합니다.</p>
        <Link href={storefrontHref()} className="mt-6 inline-block text-sm text-rose-600 hover:underline">
          ← 홈으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 주문 관리</h1>
        <Link href="/admin" className="text-sm text-rose-600 hover:underline">
          대시보드
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={buildAdminOrdersHref(1, "active", range, filters)}
          prefetch={false}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            view === "active"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          주문 목록
        </Link>
        <Link
          href={buildAdminOrdersHref(1, "deleted", range, filters)}
          prefetch={false}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
            view === "deleted"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          삭제됨{deletedCount > 0 ? ` (${deletedCount})` : ""}
        </Link>
      </div>
      <OrderDateFilters key={`${range.start}:${range.end}:${view}`} range={range} view={view} filters={filters} />
      <form key={JSON.stringify(filters)} action="/admin/orders" className="mt-4 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        {view === "deleted" && <input type="hidden" name="view" value="deleted" />}
        {range.start && <input type="hidden" name="start" value={range.start} />}
        {range.end && <input type="hidden" name="end" value={range.end} />}
        <label className="text-xs text-zinc-500">고객·주문 검색<input name="q" defaultValue={filters.q} placeholder="회사, 이름, 이메일, 주문 번호" className="mt-1 w-full rounded-lg border p-2 text-sm text-zinc-900" /></label>
        <label className="text-xs text-zinc-500">처리 단계<select name="stage" defaultValue={filters.stage ?? ""} className="mt-1 w-full rounded-lg border p-2 text-sm text-zinc-900"><option value="">전체 단계</option>{Object.entries(ORDER_STAGES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-xs text-zinc-500">고객 국가<select name="country" defaultValue={filters.country ?? ""} className="mt-1 w-full rounded-lg border p-2 text-sm text-zinc-900"><option value="">전체 국가</option>{COUNTRY_REGIONS.map(region => <option key={region.code} value={region.code}>{region.name} ({region.code})</option>)}</select></label>
        <label className="text-xs text-zinc-500">빠른 필터<select name="focus" defaultValue={filters.focus ?? ""} className="mt-1 w-full rounded-lg border p-2 text-sm text-zinc-900"><option value="">전체 · 미확인 우선</option><option value="unread">미확인</option><option value="unanswered">견적 발송 전</option><option value="mine">내 담당</option></select></label>
        <button className="self-end rounded-lg bg-violet-700 p-2 text-sm font-semibold text-white">검색·필터 적용</button>
      </form>
      <p className="mt-2 text-sm text-zinc-500">
        {total === 0
          ? view === "deleted"
            ? "삭제한 주문이 없습니다."
            : "장바구니 견적과 주문이 함께 표시됩니다"
          : `총 ${total}건 · ${from}–${to}번째 · ${page}/${totalPages}페이지`}
      </p>
      <details className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-zinc-700">기간별 건수·합계 펼치기</summary><AdminOrderPeriodTotals key={`${range.start}:${range.end}:${view}`} totals={periodTotals} view={view} /></details>
      <p className="mt-3 text-xs text-zinc-500">최신 접수순으로 표시합니다. 견적 요청 금액이 포함된 접수 기준 합계입니다. 결제 완료 매출과는 다릅니다. 접수일은 한국시간(KST)으로 표시합니다.</p>
      <OrderWorkspace admins={admins}
        orders={orders}
        view={view}
        amountTotal={amountTotal}
        pageAmountTotal={pageAmountTotal}
        total={total}
      />
      <OrdersPagination page={page} totalPages={totalPages} view={view} range={range} filters={filters} />
    </main>
  );
}

function OrdersPagination({
  page,
  totalPages,
  view,
  range,
  filters,
}: {
  page: number;
  totalPages: number;
  view: "active" | "deleted";
  range: AdminOrderDateRange;
  filters: OrderFilters;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="주문 목록 페이지">
      {page > 1 ? (
        <Link
          href={buildAdminOrdersHref(page - 1, view, range, filters)}
          prefetch={false}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
        >
          ← 이전
        </Link>
      ) : (
        <span className="rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-300">← 이전</span>
      )}
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) =>
        item === page ? (
          <span
            key={item}
            aria-current="page"
            className="min-w-9 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm font-semibold text-rose-700"
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={buildAdminOrdersHref(item, view, range, filters)}
            prefetch={false}
            className="min-w-9 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link
          href={buildAdminOrdersHref(page + 1, view, range, filters)}
          prefetch={false}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
        >
          다음 →
        </Link>
      ) : (
        <span className="rounded-lg border border-transparent px-3 py-2 text-sm text-zinc-300">다음 →</span>
      )}
    </nav>
  );
}
