"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  placeOrder,
  type CheckoutState,
} from "@/app/actions/checkout";
import { formatKRW } from "@/lib/utils";
import type { CartView } from "@/types/cart";

type Props = {
  cart: CartView;
  shippingCost: number;
  total: number;
  stripeEnabled: boolean;
  stripeMessage: string;
};

const initialState: CheckoutState = {};

export function CheckoutForm({
  cart,
  shippingCost,
  total,
  stripeEnabled,
  stripeMessage,
}: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(placeOrder, initialState);

  useEffect(() => {
    if (state.checkoutUrl) {
      window.location.href = state.checkoutUrl;
      return;
    }

    if (state.demoMode && state.orderNumber) {
      router.push(`/orders/${state.orderNumber}`);
    }
  }, [state.checkoutUrl, state.demoMode, state.orderNumber, router]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">배송 정보</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">수령인</span>
            <input
              name="recipient_name"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">연락처</span>
            <input
              name="phone"
              type="tel"
              required
              placeholder="010-0000-0000"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">주소</span>
            <input
              name="line1"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">도시</span>
            <input
              name="city"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-600">우편번호</span>
            <input
              name="postal_code"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-zinc-600">국가 코드</span>
            <input
              name="country_code"
              defaultValue="KR"
              required
              maxLength={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm uppercase focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">주문 요약</h2>
        <ul className="mt-4 space-y-3">
          {cart.items.map((item) => (
            <li
              key={item.productId}
              className="flex items-start justify-between gap-4 text-sm"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-zinc-500">
                  {item.quantity}개 × {formatKRW(item.unitPrice)}
                </p>
              </div>
              <p className="font-medium">{formatKRW(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-600">소계</span>
            <span>{formatKRW(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-600">배송비</span>
            <span>
              {shippingCost === 0 ? "무료" : formatKRW(shippingCost)}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>합계</span>
            <span className="text-rose-700">{formatKRW(total)}</span>
          </div>
        </div>
        <p
          className={`mt-3 text-xs ${stripeEnabled ? "text-emerald-700" : "text-amber-700"}`}
        >
          {stripeMessage}
        </p>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || Boolean(state.checkoutUrl)}
        className="w-full rounded-xl bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending
          ? "처리 중…"
          : stripeEnabled
            ? "Stripe로 결제하기"
            : "주문하기 (데모 · 결제 없음)"}
      </button>
    </form>
  );
}
