"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  addToCart,
  type CartActionState,
} from "@/app/actions/cart";
import { MoqQuantityInput, snapMoqFormQuantity } from "@/components/store/moq-quantity-input";
import { getMoqStep } from "@/lib/store/moq-quantity";
import { isProductSoldOut } from "@/lib/store/products-url";

type Props = {
  productId: string;
  moq: number;
  stock: number;
  soldOut?: boolean;
  disabled?: boolean;
};

const initialState: CartActionState = {};

export function AddToCartForm({ productId, moq, stock, soldOut = false, disabled }: Props) {
  const t = useTranslations("cart");
  const [state, formAction, pending] = useActionState(addToCart, initialState);
  const unavailable = isProductSoldOut({ sold_out: soldOut, stock });
  const safeMoq = getMoqStep(moq);
  const maxQuantity = 999999;

  return (
    <form
      action={formAction}
      noValidate
      className="mt-6 space-y-3"
      onSubmit={(event) => snapMoqFormQuantity(event.currentTarget, safeMoq, maxQuantity)}
    >
      <input type="hidden" name="productId" value={productId} />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="quantity" className="text-sm font-medium text-zinc-700">
          {t("quantity")}
        </label>
        <MoqQuantityInput
          moq={safeMoq}
          defaultValue={safeMoq}
          max={unavailable ? safeMoq : maxQuantity}
          disabled={unavailable || disabled}
          className="w-20 rounded-lg border border-zinc-300 px-2 py-2 text-center text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-zinc-100"
        />
        <span className="text-xs text-zinc-500">
          {t("moqHint", { count: safeMoq, next: safeMoq * 2, third: safeMoq * 3 })}
        </span>
      </div>
      <button
        type="submit"
        disabled={pending || unavailable || disabled}
        className="w-full rounded-xl bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
      >
        {pending ? t("adding") : unavailable ? t("outOfStock") : t("addToCart")}
      </button>
      {state.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600">{state.success}</p>
      ) : null}
    </form>
  );
}
