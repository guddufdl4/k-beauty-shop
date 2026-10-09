import Link from "next/link";
import { AdminOrderDeleteButton } from "@/components/admin/admin-order-delete-button";
import { AdminOrderPeriodTotals } from "@/components/admin/order-period-totals";
import { AdminOrderRestoreButton } from "@/components/admin/admin-order-restore-button";
import { OrderDateFilters } from "@/components/admin/order-date-filters";
import {
  ADMIN_ORDERS_PAGE_SIZE,
  buildAdminOrdersHref,
  formatAdminOrderDate,
  listAdminOrders,
  parseAdminOrdersPage,
  parseAdminOrdersView,
  normalizeAdminOrderDateRange,
  type AdminOrderDateRange,
  type AdminOrderRow,
} from "@/lib/admin/orders";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { storefrontHref } from "@/lib/store/storefront-href";
import { formatKRW } from "@/lib/utils";

export const dynamic = "force-dynamic";

function paymentLabel(order: AdminOrderRow) {
  if (order.payment_provider === "quote") {
    return "견적 메일";
  }
  if (order.status !== "paid") {
    return "—";
  }
  if (order.payment_provider === "stripe") {
    return "Stripe";
  }
  if (order.payment_provider === "demo") {
    return "데모";
  }
  return order.payment_provider ?? "—";
}

function statusBadge(status: string, paymentProvider: string | null) {
  if (paymentProvider === "quote") {
    return (
      <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
        견적
      </span>
    );
  }
  const paid = status === "paid";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {paid ? "결제 완료" : "대기"}
    </span>
  );
}

type AdminOrdersPageProps = {
  searchParams: Promise<{ page?: string | string[]; view?: string | string[]; start?: string | string[]; end?: string | string[] }>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const { configured, user, profile } = await getSessionProfile();
  const params = await searchParams;
  const view = parseAdminOrdersView(params.view);
  const requestedPage = parseAdminOrdersPage(params.page);
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
  } = await listAdminOrders(requestedPage, view, range);
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
        <OrdersTable
          orders={orders}
          view={view}
          amountTotal={amountTotal}
          pageAmountTotal={pageAmountTotal}
          total={total}
        />
        <OrdersPagination page={page} totalPages={totalPages} view={view} range={range} />
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
          href={buildAdminOrdersHref(1, "active", range)}
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
          href={buildAdminOrdersHref(1, "deleted", range)}
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
      <OrderDateFilters key={`${range.start}:${range.end}:${view}`} range={range} view={view} />
      <p className="mt-2 text-sm text-zinc-500">
        {total === 0
          ? view === "deleted"
            ? "삭제한 주문이 없습니다."
            : "장바구니 견적과 주문이 함께 표시됩니다"
          : `총 ${total}건 · ${from}–${to}번째 · ${page}/${totalPages}페이지`}
      </p>
      <AdminOrderPeriodTotals key={`${range.start}:${range.end}:${view}`} totals={periodTotals} view={view} />
      <p className="mt-3 text-xs text-zinc-500">견적 요청 금액이 포함된 접수 기준 합계입니다. 결제 완료 매출과는 다릅니다. 접수일은 한국시간(KST)으로 표시합니다.</p>
      <OrdersTable
        orders={orders}
        view={view}
        amountTotal={amountTotal}
        pageAmountTotal={pageAmountTotal}
        total={total}
      />
      <OrdersPagination page={page} totalPages={totalPages} view={view} range={range} />
    </main>
  );
}

function OrdersPagination({
  page,
  totalPages,
  view,
  range,
}: {
  page: number;
  totalPages: number;
  view: "active" | "deleted";
  range: AdminOrderDateRange;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="주문 목록 페이지">
      {page > 1 ? (
        <Link
          href={buildAdminOrdersHref(page - 1, view, range)}
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
            href={buildAdminOrdersHref(item, view, range)}
            prefetch={false}
            className="min-w-9 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-center text-sm text-zinc-700 hover:border-rose-200 hover:text-rose-700"
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link
          href={buildAdminOrdersHref(page + 1, view, range)}
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

function OrdersTable({
  orders,
  view,
  amountTotal,
  pageAmountTotal,
  total,
}: {
  orders: AdminOrderRow[];
  view: "active" | "deleted";
  amountTotal: number;
  pageAmountTotal: number;
  total: number;
}) {
  if (orders.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
        {view === "deleted"
          ? "삭제한 주문이 없습니다."
          : "아직 견적·주문이 없습니다. 스토어에서 견적 요청을 보내면 이메일과 함께 여기에 쌓입니다."}
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="admin-data-table w-full min-w-[1050px] text-left text-sm">
        <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">번호</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">회사 / 담당자</th>
            <th className="px-4 py-3">운송조건</th>
            <th className="px-4 py-3">배송</th>
            <th className="px-4 py-3">합계</th>
            <th className="px-4 py-3">일시</th>
            <th className="px-4 py-3">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {orders.map((order) => (
            <tr key={order.order_number} className="hover:bg-rose-50/40">
              <td data-label="주문 번호" className="px-4 py-3">
                <Link
                  href={storefrontHref(`/orders/${order.order_number}`)}
                  prefetch={false}
                  className="whitespace-nowrap font-mono font-medium text-rose-700 hover:underline"
                >
                  {order.order_number}
                </Link>
              </td>
              <td data-label="상태" className="px-4 py-3">
                <div className="whitespace-nowrap">
                  {statusBadge(order.status, order.payment_provider)}
                  <p className="mt-1 text-xs text-zinc-500">{paymentLabel(order)}</p>
                </div>
              </td>
              <td data-label="회사 / 담당자" className="px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900">{order.company_name || "—"}</p>
                  <p className="text-xs text-zinc-500">{order.contact_name || "—"}</p>
                  <p className="mt-1 break-all text-xs text-zinc-500">{order.email || "—"}</p>
                </div>
              </td>
              <td data-label="운송 조건" className="px-4 py-3 text-zinc-600">
                <div className="min-w-0">
                  <p>{order.trade_terms || "—"}</p>
                  <p className="text-xs text-zinc-500">
                    {[order.consignee, order.notify_party, order.shipping_address_text].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </td>
              <td data-label="배송" className="px-4 py-3 text-zinc-600">{order.shipping_method || "—"}</td>
              <td data-label="합계" className="whitespace-nowrap px-4 py-3 font-medium">{formatKRW(order.total)}</td>
              <td data-label="접수일" className="px-4 py-3 text-zinc-600">
                <time dateTime={order.created_at} className="whitespace-nowrap">{formatAdminOrderDate(order.created_at)}</time>
              </td>
              <td data-label="관리" className="px-4 py-3">
                {view === "deleted" ? (
                  <AdminOrderRestoreButton orderNumber={order.order_number} />
                ) : (
                  <AdminOrderDeleteButton orderNumber={order.order_number} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-200 bg-zinc-50">
            <td className="px-4 py-3 text-sm font-semibold text-zinc-700" colSpan={5}>
              이 페이지 합계
            </td>
            <td className="px-4 py-3 text-sm font-semibold text-zinc-900">{formatKRW(pageAmountTotal)}</td>
            <td colSpan={2} />
          </tr>
          <tr className="bg-zinc-100">
            <td className="px-4 py-3 text-sm font-bold text-zinc-800" colSpan={5}>
              {view === "deleted" ? "삭제된 주문 총합계" : "전체 총합계"} ({total}건)
            </td>
            <td className="px-4 py-3 text-base font-bold text-zinc-900">{formatKRW(amountTotal)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
