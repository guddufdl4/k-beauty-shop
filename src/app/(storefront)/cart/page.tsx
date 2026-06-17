import Link from "next/link";
import { CartItemList } from "@/components/store/cart-item-list";
import {
  calculateShippingCost,
  formatPrice,
  getCart,
  usesDatabaseCart,
} from "@/lib/cart";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [cart, dbCart] = await Promise.all([getCart(), usesDatabaseCart()]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold sm:text-3xl">장바구니</h1>
      <p className="mt-2 text-sm text-zinc-600">
        {dbCart
          ? "로그인 상태 — Supabase cart_items 테이블에 저장됩니다."
          : "데모 모드 — 쿠키 기반 장바구니(샘플 상품 ID)로 테스트할 수 있습니다."}
      </p>

      {cart.items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="text-zinc-600">장바구니가 비어 있습니다.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
          >
            상품 둘러보기
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <CartItemList items={cart.items} />

          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">주문 요약</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">소계</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">예상 배송비</span>
                <span>
                  {calculateShippingCost(cart.subtotal) === 0
                    ? "무료"
                    : formatPrice(calculateShippingCost(cart.subtotal))}
                </span>
              </div>
              <p className="text-xs text-zinc-500">10만원 이상 무료배송</p>
            </div>
            <Link
              href="/checkout"
              className="mt-6 block w-full rounded-xl bg-rose-600 py-3 text-center font-semibold text-white hover:bg-rose-700"
            >
              결제하기
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
