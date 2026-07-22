import Link from "next/link";
import { listAdminOrders } from "@/lib/admin/orders";
import { getSessionProfile } from "@/lib/supabase/auth-helpers";
import { storefrontHref } from "@/lib/store/storefront-href";
import { formatKRW } from "@/lib/utils";

function paymentLabel(order: Awaited<ReturnType<typeof listAdminOrders>>["orders"][number]) {
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

function statusBadge(status: string) {
  const paid = status === "paid";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        paid
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {paid ? "결제 완료" : "대기"}
    </span>
  );
}

export default async function AdminOrdersPage() {
  const { configured, user, profile } = await getSessionProfile();
  const { orders, demoNote } = await listAdminOrders();

  if (!configured) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 주문 관리</h1>
        {demoNote ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {demoNote}
          </p>
        ) : null}
        <OrdersTable orders={orders} />
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
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-zinc-900">관리자 · 주문 관리</h1>
        <Link href="/admin" className="text-sm text-rose-600 hover:underline">
          대시보드
        </Link>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        총 {orders.length}건 (DB)
      </p>
      <OrdersTable orders={orders} />
    </main>
  );
}

function OrdersTable({ orders }: { orders: Awaited<ReturnType<typeof listAdminOrders>>["orders"] }) {
  if (orders.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-zinc-200 bg-white px-6 py-12 text-center text-sm text-zinc-500">
        아직 주문이 없습니다. 스토어에서 체크아웃 후 이 페이지를 새로고침하세요.
      </p>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">주문번호</th>
            <th className="px-4 py-3">상태</th>
            <th className="px-4 py-3">결제</th>
            <th className="px-4 py-3">합계</th>
            <th className="px-4 py-3">일시</th>
            <th className="px-4 py-3">출처</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {orders.map((order) => (
            <tr key={order.order_number} className="hover:bg-rose-50/40">
              <td className="px-4 py-3">
                <Link
                  href={`/orders/${order.order_number}`}
                  className="font-mono font-medium text-rose-700 hover:underline"
                >
                  {order.order_number}
                </Link>
              </td>
              <td className="px-4 py-3">{statusBadge(order.status)}</td>
              <td className="px-4 py-3 text-zinc-600">{paymentLabel(order)}</td>
              <td className="px-4 py-3 font-medium">{formatKRW(order.total)}</td>
              <td className="px-4 py-3 text-zinc-600">
                {new Date(order.created_at).toLocaleString("ko-KR")}
              </td>
              <td className="px-4 py-3 text-xs text-zinc-500">
                {order.source === "database" ? "DB" : "데모 쿠키"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
