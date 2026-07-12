"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  addToCart,
  type CartActionState,
} from "@/app/actions/cart";

type Props = {
  productId: string;
  moq: number;
  stock: number;
  soldOut?: boolean;
  disabled?: boolean;
};

const initialState: CartActionState = {};

export function AddToCartForm({ productId, moq, soldOut = false, disabled }: Props) {
  const t = useTranslations("cart");
  const [state, formAction, pending] = useActionState(addToCart, initialState);
  const outOfStock = soldOut;

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm font-medium text-zinc-700">
          {t("quantity")}
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={moq}
          step={1}
          defaultValue={moq}
          disabled={outOfStock || disabled}
          className="w-28 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
        />
        <span className="text-xs text-zinc-500">{t("moqHint", { count: moq })}</span>
      </div>
      <button
        type="submit"
        disabled={pending || outOfStock || disabled}
        className="w-full rounded-xl bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
      >
        {pending ? t("adding") : outOfStock ? t("outOfStock") : t("addToCart")}
      </button>
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}
    </form>
  );
}
