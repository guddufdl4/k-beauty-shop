import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { confirmOrderPayment } from "@/app/actions/checkout";
import { formatPrice, getOrderByNumber } from "@/lib/cart";

type Props = {
  params: Promise<{ order_number: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "결제 대기",
  paid: "결제 완료",
  processing: "처리 중",
  shipped: "배송 중",
  delivered: "배송 완료",
  cancelled: "취소됨",
  refunded: "환불됨",
};

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { order_number } = await params;
  const { session_id: sessionId } = await searchParams;

  if (sessionId) {
    await confirmOrderPayment(order_number, sessionId);
  }

  const { order } = await getOrderByNumber(order_number);

  if (!order) {
    notFound();
  }

  const isPaid = order.status === "paid";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div
        className={`rounded-2xl border px-6 py-4 ${
          isPaid ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
        }`}
      >
        <p className={`text-sm font-medium ${isPaid ? "text-emerald-800" : "text-amber-800"}`}>
          {isPaid ? "결제가 완료되었습니다" : "주문이 접수되었습니다"}
        </p>
        <p className={`mt-1 text-2xl font-bold ${isPaid ? "text-emerald-900" : "text-amber-900"}`}>
          {order.order_number}
        </p>
        <p className={`mt-1 text-sm ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>
          상태: {STATUS_LABEL[order.status] ?? order.status}
          {!isPaid ? " · Stripe 키 없으면 데모 모드(결제 없음)" : null}
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">주문 상품</h2>
        <ul className="mt-4 space-y-3">
          {order.items.map((item, index) => (
            <li key={`${item.product_sku}-${index}`} className="flex justify-between gap-4 text-sm">
              <div>
                <p className="font-medium">{item.product_name}</p>
                <p className="text-zinc-500">
                  {item.quantity}개 · SKU {item.product_sku}
                </p>
              </div>
              <p className="font-medium">{formatPrice(item.line_total)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/products"
          className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
        >
          쇼핑 계속하기
        </Link>
        <Link
          href="/account"
          className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold hover:border-rose-300"
        >
          마이페이지
        </Link>
      </div>
    </main>
  );
}
