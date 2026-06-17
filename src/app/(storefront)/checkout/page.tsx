import Link from "next/link";
import { CheckoutForm } from "@/components/store/checkout-form";
import {
  calculateShippingCost,
  getCart,
  usesDatabaseCart,
} from "@/lib/cart";
import { getStripeStatusMessage, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const [cart, dbCart, params] = await Promise.all([
    getCart(),
    usesDatabaseCart(),
    searchParams,
  ]);
  const shippingCost = calculateShippingCost(cart.subtotal);
  const total = cart.subtotal + shippingCost;
  const stripeEnabled = isStripeConfigured();

  if (cart.items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-bold sm:text-3xl">결제</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">장바구니가 비어 있어 주문할 수 없습니다.</p>
          <Link
            href="/cart"
            className="mt-4 inline-block py-3 text-sm text-rose-600 hover:underline"
          >
            장바구니로 이동
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <Link href="/cart" className="text-sm text-rose-600 hover:underline">
        ← 장바구니
      </Link>
      <h1 className="mt-4 text-2xl font-bold sm:text-3xl">주문 / 결제</h1>
      {params.cancelled ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          결제가 취소되었습니다. 다시 시도해 주세요.
        </p>
      ) : null}
      <p className="mt-2 text-sm text-zinc-600">
        {dbCart
          ? "주문은 Supabase orders 테이블에 저장됩니다."
          : "데모 주문은 쿠키에 저장됩니다. 로그인 + Supabase 연동 시 DB에 저장됩니다."}
      </p>
      <div className="mt-8">
        <CheckoutForm
          cart={cart}
          shippingCost={shippingCost}
          total={total}
          stripeEnabled={stripeEnabled}
          stripeMessage={getStripeStatusMessage()}
        />
      </div>
    </main>
  );
}
